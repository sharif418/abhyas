package bd.abhyas.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * DnsVpnService — the DNS-only content filter for অভ্যাস.
 *
 * This is the engine behind ContentGuardPlugin, following the local-VPN
 * pattern used by Blokada / personalDNSfilter / RethinkDNS:
 *
 * ── What the tunnel actually carries ─────────────────────────────────────
 * The Builder adds ONE address (10.111.0.1/24) and routes ONLY the resolver
 * IPs (/32 each) through the TUN: the mode's upstream pair plus a hijack
 * list of well-known public resolvers (8.8.8.8, 1.1.1.1, …) so apps that
 * HARDCODE their own DNS are filtered too. There is deliberately NO
 * 0.0.0.0/0 route — all non-DNS traffic (HTTPS, everything) bypasses the
 * tunnel entirely, which is why this cannot slow the phone down or see any
 * content: the VPN only ever observes DOMAIN NAMES.
 *
 * ── Packet path ──────────────────────────────────────────────────────────
 * reader thread ──► IPv4/UDP port-53 parse ──► rule match
 *      │ allow-list hit ─────────────► forward upstream unchanged
 *      │ block-list hit ─► craft REFUSED response (QR=1, RCODE=3, question
 *      │                    echoed back) ─► write straight into the TUN
 *      └ default ──────► forward to the mode's upstream via a DatagramSocket
 *                         protected with VpnService.protect() (otherwise our
 *                         own query would loop back into the tunnel).
 * Upstream answers are written back into the TUN spoofed as coming from the
 * ORIGINAL destination the client queried (upstream or hijacked resolver),
 * so both the system resolver and hardcoded-DNS apps accept them.
 *
 * ── Rules ────────────────────────────────────────────────────────────────
 * allow[] always wins (a passthrough the user explicitly wants, even in
 * family mode), then block[] (exact or *.wildcard, apex included). The
 * block list is applied LOCALLY with REFUSED; the mode's upstream applies
 * its own filtering on everything forwarded. Unparseable queries are
 * forwarded, not guessed at — a filter that fails OPEN on weird packets is
 * still filtered upstream, while one that fails CLOSED could break the
 * phone's DNS outright.
 *
 * ── Threading ────────────────────────────────────────────────────────────
 * One blocking reader thread (setBlocking(true) → no polling), a 4-thread
 * executor for upstream round-trips, and a single writer guarded by
 * tunWriteLock. A bounded inflight map (query-ID + client) drops duplicate
 * retransmissions and applies backpressure instead of ballooning memory.
 *
 * ── Counters & privacy ───────────────────────────────────────────────────
 * blockedToday / totalToday are plain longs in SharedPreferences under a
 * yyyy-MM-dd key (auto-reset at midnight), persisted at most every 10 s or
 * 100 queries so the hot path stays allocation-light. Nothing else is
 * recorded; no browsing data ever leaves the device.
 *
 * ── Known limitations (documented, not hidden) ───────────────────────────
 * • DNS-over-TCP and DNS-over-HTTPS (e.g. 8.8.8.8:443, DoH) cannot be seen
 *   by a DNS-only filter — DoH-using apps bypass it (as they bypass every
 *   DNS-based filter on the market).
 * • IPv6 is not routed into the tunnel; the OS uses our IPv4 resolvers, but
 *   an app hardcoding an IPv6 resolver bypasses too.
 * • Responses larger than the MTU are honestly truncated with the DNS TC
 *   bit set (rare — modern resolvers cap UDP answers well under 1500).
 */
public class DnsVpnService extends VpnService {

    /** Quiet foreground channel (persistent "filter running" notification). */
    public static final String CHANNEL_ID = "abhyas_content_guard";
    /** Notification-action intent that stops the filter from the shade. */
    public static final String ACTION_STOP = "bd.abhyas.app.DnsVpnService.ACTION_STOP";

    static final String PREFS_NAME = "abhyas_content_guard";
    private static final String KEY_MODE = "mode";
    private static final String KEY_BLOCK = "block_rules";
    private static final String KEY_ALLOW = "allow_rules";
    private static final String KEY_PENDING_CONSENT = "vpn_consent_pending";
    private static final String COUNTER_PREFIX_BLOCKED = "blocked_";
    private static final String COUNTER_PREFIX_TOTAL = "total_";

    /** Fallback mode when a sticky restart finds no persisted mode. */
    private static final String DEFAULT_MODE = "family";

    private static final int NOTIFICATION_ID = 0x4347; // "CG"
    private static final int TUNNEL_MTU = 1500;
    /** Largest DNS message we can carry inside one MTU-sized IPv4/UDP packet. */
    private static final int MAX_DNS_PAYLOAD = TUNNEL_MTU - 20 - 8; // 1472
    private static final String TUN_ADDRESS = "10.111.0.1";
    private static final int TUN_PREFIX = 24;
    private static final int DNS_PORT = 53;
    private static final int UPSTREAM_TIMEOUT_MS = 5000;
    private static final int READ_BUFFER = 32767;
    private static final int UPSTREAM_RECV_BUFFER = 4096;
    /** Backpressure ceiling for in-flight queries. */
    private static final int MAX_INFLIGHT = 256;
    private static final int FORWARD_THREADS = 4;

    private static final long PERSIST_INTERVAL_MS = 10_000;
    private static final long PERSIST_EVERY_N = 100;

    /** mode → {primary upstream, secondary upstream} (plain DNS, port 53). */
    private static final Map<String, String[]> UPSTREAMS = new LinkedHashMap<>();
    static {
        UPSTREAMS.put("family", new String[]{"185.228.168.168", "185.228.169.168"});   // CleanBrowsing Family
        UPSTREAMS.put("security", new String[]{"9.9.9.9", "149.112.112.112"});         // Quad9
        UPSTREAMS.put("ads", new String[]{"94.140.14.14", "94.140.15.15"});            // AdGuard DNS
        UPSTREAMS.put("custom", new String[]{"1.1.1.1", "1.0.0.1"});                   // Cloudflare
    }

    /** Safety net when the persisted mode is somehow unknown. */
    private static final String[] UPSTREAM_FALLBACK = {"1.1.1.1", "1.0.0.1"};

    /**
     * Well-known public resolvers routed /32 into the tunnel so apps that
     * hardcode their own DNS (Chrome's async DNS, some SDKs) are filtered
     * too. Duplicate-safe: kept alongside the mode's upstreams in a set.
     */
    private static final String[] HIJACK_ROUTES = {
            "8.8.8.8", "8.8.4.4",                       // Google
            "1.1.1.1", "1.0.0.1",                       // Cloudflare
            "9.9.9.9", "149.112.112.112",               // Quad9
            "94.140.14.14", "94.140.15.15",             // AdGuard
            "185.228.168.168", "185.228.169.168",       // CleanBrowsing
            "208.67.222.222", "208.67.220.220",         // OpenDNS
    };

    // ── Service state ─────────────────────────────────────────────────────

    /** Volatile: ContentGuardPlugin reads it from the bridge thread. */
    private static volatile boolean running = false;

    /** True while the filter VPN is up. */
    public static boolean isRunning() {
        return running;
    }

    /** Live instance reference so the plugin can push rule changes (volatile swap). */
    private static volatile DnsVpnService instance = null;

    private volatile String activeMode;
    private volatile ParcelFileDescriptor tunFd;
    private volatile FileInputStream tunIn;
    private volatile FileOutputStream tunOut;
    private final Object tunWriteLock = new Object();
    private Thread readerThread;
    private ExecutorService forwardExecutor;
    /** In-flight queries: key = (query-ID, client) → dispatch time (ms). */
    private final ConcurrentHashMap<Long, Long> inflight = new ConcurrentHashMap<>();
    /** Identification field for the IPv4 headers we craft. */
    private final AtomicInteger ipId = new AtomicInteger(1);

    /** Rule lists — swapped atomically (volatile references) by the plugin thread. */
    private volatile String[] blockRules = new String[0];
    private volatile String[] allowRules = new String[0];

    // Day-scoped counters (reader-thread only, persisted lazily).
    private long blockedToday;
    private long totalToday;
    private String counterDate;
    private long lastPersistAt;
    private long queriesSincePersist;

    // ── Lifecycle ─────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        running = true;
        createChannel();
        loadCounters();
        loadRulesFromPrefs();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            // "বন্ধ করুন" action from the persistent notification.
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        // A service started with startForegroundService() MUST promote itself
        // within 5 seconds (API 26+) — before any slow work like establishing.
        startForeground(NOTIFICATION_ID, buildNotification());
        // Covers both a fresh start and a START_STICKY restart (null intent):
        // mode + rules are (re)read from prefs, and the tunnel is only
        // re-established when the mode actually changed.
        ensureTunnel();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (instance == this) instance = null;
        teardownTunnel();
        persistCountersNow();
        super.onDestroy();
    }

    // ── Tunnel management ─────────────────────────────────────────────────

    /** Idempotent: (re)establishes the TUN to match the persisted mode. */
    private synchronized void ensureTunnel() {
        String mode = getMode(this);
        if (mode == null) {
            // Sticky restart with no configuration: family is the safe default
            // for a content guard (it can only over-block, never under-block).
            mode = DEFAULT_MODE;
        }
        if (tunFd != null && mode.equals(activeMode)) {
            return; // tunnel already up with the correct mode
        }
        if (tunFd != null) {
            teardownTunnel(); // mode switch → fresh routes/DNS for the new upstreams
        }
        establishTunnel(mode);
    }

    /**
     * Builds the DNS-only TUN device:
     * session name, MTU 1500, one IPv4 address, the mode's first upstream as
     * THE system DNS (so the OS routes its queries into the tunnel), and /32
     * routes for exactly the upstream + hijack resolvers. No default route —
     * this is a DNS filter, not a full VPN.
     */
    private void establishTunnel(String mode) {
        try {
            String[] upstreams = UPSTREAMS.containsKey(mode)
                    ? UPSTREAMS.get(mode) : UPSTREAM_FALLBACK;

            Builder builder = new Builder()
                    .setSession("অভ্যাস সামগ্রী নিয়ন্ত্রণ")
                    .setMtu(TUNNEL_MTU)
                    .addAddress(TUN_ADDRESS, TUN_PREFIX)
                    .addDnsServer(upstreams[0])
                    .setBlocking(true);

            Set<String> routes = new LinkedHashSet<>(Arrays.asList(upstreams));
            routes.addAll(Arrays.asList(HIJACK_ROUTES));
            for (String ip : routes) {
                builder.addRoute(ip, 32); // /32 — single host, nothing broader
            }

            ParcelFileDescriptor fd = builder.establish();
            if (fd == null) {
                // Consent revoked / another always-on VPN owns the slot — stop
                // honestly instead of pretending the filter is running.
                stopSelf();
                return;
            }
            tunFd = fd;
            tunIn = new FileInputStream(fd.getFileDescriptor());
            tunOut = new FileOutputStream(fd.getFileDescriptor());
            activeMode = mode;

            forwardExecutor = Executors.newFixedThreadPool(FORWARD_THREADS, new ThreadFactory() {
                private final AtomicInteger n = new AtomicInteger(1);
                @Override
                public Thread newThread(Runnable r) {
                    Thread t = new Thread(r, "dns-forwarder-" + n.getAndIncrement());
                    t.setDaemon(true);
                    return t;
                }
            });
            readerThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    readerLoop();
                }
            }, "dns-tun-reader");
            readerThread.start();
        } catch (Exception e) {
            // establish() throws when consent was revoked or the interface
            // cannot be created — same honest stop.
            stopSelf();
        }
    }

    /**
     * Closes the TUN (closing the fd brings the interface down), shuts the
     * forwarder pool and clears inflight state. Closing tunIn unblocks the
     * reader thread's read() with an IOException — that is its exit signal.
     */
    private void teardownTunnel() {
        Thread reader = readerThread;
        readerThread = null;
        ExecutorService executor = forwardExecutor;
        forwardExecutor = null;

        ParcelFileDescriptor fd;
        synchronized (tunWriteLock) {
            fd = tunFd;
            tunFd = null;
            FileInputStream in = tunIn;
            tunIn = null;
            FileOutputStream out = tunOut;
            tunOut = null;
            try {
                if (in != null) in.close();
            } catch (IOException ignored) {
            }
            try {
                if (out != null) out.close();
            } catch (IOException ignored) {
            }
        }
        inflight.clear();
        activeMode = null;
        if (executor != null) executor.shutdownNow();
        if (fd != null) {
            try {
                fd.close();
            } catch (IOException ignored) {
            }
        }
        if (reader != null) reader.interrupt();
    }

    // ── Reader loop: TUN → parse → filter/forward ────────────────────────

    /** Blocking read loop — one packet per read (TUN semantics). */
    private void readerLoop() {
        byte[] buf = new byte[READ_BUFFER];
        while (tunFd != null) {
            int n;
            try {
                FileInputStream in = tunIn;
                if (in == null) break;
                n = in.read(buf);
            } catch (IOException | RuntimeException e) {
                break; // fd closed → stopping or re-establishing
            }
            if (n <= 0) continue;
            try {
                handlePacket(buf, n);
            } catch (RuntimeException e) {
                // One malformed packet must never kill the filter.
            }
        }
    }

    /**
     * Parses one IPv4/UDP packet off the TUN. Silently drops everything that
     * is not an IPv4 UDP datagram to port 53 (only resolvers are routed
     * here, so this is belt-and-braces, not a firewall).
     */
    private void handlePacket(byte[] buf, int n) {
        if (n < 28) return;                          // 20 (min IP) + 8 (UDP)
        if (((buf[0] >> 4) & 0xF) != 4) return;      // IPv4 only (no IPv6 is routed)
        int ihl = (buf[0] & 0xF) * 4;
        if (ihl < 20 || n < ihl + 8) return;
        int totalLength = ((buf[2] & 0xFF) << 8) | (buf[3] & 0xFF);
        if (totalLength < ihl + 8 || totalLength > n) return;
        int frag = ((buf[6] & 0xFF) << 8) | (buf[7] & 0xFF);
        if ((frag & 0x3FFF) != 0) return;            // fragmented / offset — drop
        if ((buf[9] & 0xFF) != 17) return;           // UDP only (TCP DNS is dropped)

        int srcPort = ((buf[ihl] & 0xFF) << 8) | (buf[ihl + 1] & 0xFF);
        int dstPort = ((buf[ihl + 2] & 0xFF) << 8) | (buf[ihl + 3] & 0xFF);
        if (dstPort != DNS_PORT) return;

        int dnsOff = ihl + 8;
        int dnsLen = totalLength - ihl - 8;
        if (dnsLen < 17) return;                     // header(12) + qname(≥1) + type/class(4)

        int clientIp = packIp(buf, 12);
        // Where the CLIENT thinks it sent the query — the mode upstream, or a
        // hijacked hardcoded resolver. Responses are spoofed from here.
        int serverIp = packIp(buf, 16);

        // The reader buffer is reused — snapshot the DNS message.
        byte[] query = Arrays.copyOfRange(buf, dnsOff, dnsOff + dnsLen);
        DnsQuestion question = parseQuestion(query, dnsLen);

        countTotal(); // every DNS query seen today

        if (question != null && isBlocked(question.domain)) {
            countBlocked();
            byte[] refused = buildRefusedResponse(query, question);
            writeResponse(refused, refused.length, clientIp, srcPort, serverIp);
            return;
        }

        dispatchForward(query, dnsLen, clientIp, srcPort, serverIp);
    }

    /**
     * Hands a query to the forwarder pool with duplicate/backpressure
     * protection via the bounded inflight map (key = query ID + client).
     */
    private void dispatchForward(byte[] query, int dnsLen, int clientIp, int clientPort, int serverIp) {
        ExecutorService executor = forwardExecutor;
        if (executor == null || tunFd == null) return;
        int tid = ((query[0] & 0xFF) << 8) | (query[1] & 0xFF);
        long key = (((long) tid) << 32) | ((clientIp ^ (clientPort << 16)) & 0xFFFFFFFFL);
        if (inflight.size() >= MAX_INFLIGHT) return;                 // backpressure: drop
        if (inflight.putIfAbsent(key, SystemClock.elapsedRealtime()) != null) {
            return;                                                  // retransmit already in flight
        }
        try {
            executor.execute(new ForwardTask(query, dnsLen, clientIp, clientPort, serverIp, key));
        } catch (RuntimeException rejected) {
            inflight.remove(key); // pool shutting down mid-dispatch
        }
    }

    /**
     * One upstream round-trip on a fresh, protect()ed socket. Tries the
     * primary resolver, then the secondary on timeout/failure — resilience
     * without trusting a single third party.
     */
    private final class ForwardTask implements Runnable {
        private final byte[] query;
        private final int queryLen;
        private final int clientIp;
        private final int clientPort;
        private final int serverIp;
        private final long inflightKey;

        ForwardTask(byte[] query, int queryLen, int clientIp, int clientPort,
                    int serverIp, long inflightKey) {
            this.query = query;
            this.queryLen = queryLen;
            this.clientIp = clientIp;
            this.clientPort = clientPort;
            this.serverIp = serverIp;
            this.inflightKey = inflightKey;
        }

        @Override
        public void run() {
            DatagramSocket socket = null;
            try {
                socket = new DatagramSocket();
                socket.setSoTimeout(UPSTREAM_TIMEOUT_MS);
                // CRITICAL: protect() excludes this socket from our own VPN
                // routes — without it the upstream query would loop back
                // into the tunnel forever.
                if (!protect(socket)) {
                    return;
                }
                String[] upstreams = currentUpstreams();
                byte[] response = null;
                int responseLen = 0;
                for (String upstreamIp : upstreams) {
                    try {
                        InetAddress address = InetAddress.getByName(upstreamIp);
                        socket.send(new DatagramPacket(query, queryLen, address, DNS_PORT));
                        byte[] recv = new byte[UPSTREAM_RECV_BUFFER];
                        DatagramPacket packet = new DatagramPacket(recv, recv.length);
                        socket.receive(packet);
                        int len = packet.getLength();
                        if (len > 12 && recv[0] == query[0] && recv[1] == query[1]) {
                            // Transaction ID matches the question we asked.
                            response = recv;
                            responseLen = len;
                            break;
                        }
                        // Stale/wrong-ID answer → try the secondary resolver.
                    } catch (IOException e) {
                        // Timeout or unreachable → try the secondary resolver.
                    }
                }
                if (response != null && tunFd != null) {
                    writeResponse(response, responseLen, clientIp, clientPort, serverIp);
                }
            } catch (IOException | RuntimeException e) {
                // Dropped query — the client will retry if it still cares.
            } finally {
                inflight.remove(inflightKey);
                if (socket != null) socket.close();
            }
        }
    }

    // ── Rule matching ────────────────────────────────────────────────────

    /** allow-list wins over everything; then the custom block-list. */
    private boolean isBlocked(String domain) {
        for (String rule : allowRules) {
            if (matches(domain, rule)) return false;
        }
        for (String rule : blockRules) {
            if (matches(domain, rule)) return true;
        }
        return false;
    }

    /**
     * Exact match, or wildcard "*.example.com" / ".example.com" which covers
     * the apex and every subdomain of it (user intent for "block that site").
     */
    private static boolean matches(String domain, String rule) {
        if (rule.startsWith("*.")) {
            String base = rule.substring(2);
            return domain.endsWith("." + base) || domain.equals(base);
        }
        if (rule.startsWith(".")) {
            String base = rule.substring(1);
            return domain.endsWith("." + base) || domain.equals(base);
        }
        return domain.equals(rule);
    }

    private void loadRulesFromPrefs() {
        blockRules = readRuleArray(this, KEY_BLOCK);
        allowRules = readRuleArray(this, KEY_ALLOW);
    }

    // ── DNS wire format ──────────────────────────────────────────────────

    /** Parsed first DNS question (domain + wire length of the QNAME). */
    private static final class DnsQuestion {
        final String domain;
        /** Wire bytes of the question name, labels + root terminator. */
        final int qnameWireLen;

        DnsQuestion(String domain, int qnameWireLen) {
            this.domain = domain;
            this.qnameWireLen = qnameWireLen;
        }
    }

    /**
     * Parses the first question's QNAME (labels, no compression pointers in
     * questions), lowercased. Returns null when anything is off — the caller
     * then forwards the query untouched (fail-open; upstream still filters).
     */
    private static DnsQuestion parseQuestion(byte[] dns, int dnsLen) {
        int qdcount = ((dns[4] & 0xFF) << 8) | (dns[5] & 0xFF);
        if (qdcount < 1) return null;
        StringBuilder name = new StringBuilder();
        int pos = 12;
        while (true) {
            if (pos >= dnsLen) return null;
            int label = dns[pos++] & 0xFF;
            if (label == 0) break;                   // root label → name complete
            if (label > 63 || pos + label > dnsLen) return null;
            for (int i = 0; i < label; i++) {
                name.append((char) (dns[pos + i] & 0xFF));
            }
            pos += label;
            name.append('.');
        }
        if (pos + 4 > dnsLen) return null;           // QTYPE + QCLASS must fit
        String domain = name.length() > 0
                ? name.substring(0, name.length() - 1).toLowerCase(Locale.US)
                : "";
        return new DnsQuestion(domain, pos - 12);
    }

    /**
     * REFUSED response for a blocked query: the original 12-byte header with
     * QR=1 and RCODE=3 (RA=0), zero answer/authority/additional counts, and
     * the original question section echoed back. Standards-clean way to say
     * "this name is refused here" without forging addresses.
     */
    private static byte[] buildRefusedResponse(byte[] query, DnsQuestion question) {
        int questionLen = question.qnameWireLen + 4; // QNAME + QTYPE + QCLASS
        byte[] resp = new byte[12 + questionLen];
        System.arraycopy(query, 0, resp, 0, 12);
        resp[2] = (byte) (query[2] | 0x80);          // QR=1 (response); OPCODE+RD kept
        resp[3] = (byte) ((query[3] & 0xF0) | 3);    // RCODE=REFUSED; RA=0, Z=0
        resp[4] = query[4];                          // QDCOUNT preserved
        resp[5] = query[5];
        resp[6] = 0; resp[7] = 0;                    // ANCOUNT = 0
        resp[8] = 0; resp[9] = 0;                    // NSCOUNT = 0
        resp[10] = 0; resp[11] = 0;                  // ARCOUNT = 0 (EDNS dropped)
        System.arraycopy(query, 12, resp, 12, questionLen);
        return resp;
    }

    // ── Response writing (packet crafting) ───────────────────────────────

    /**
     * Wraps a DNS message into a fresh IPv4/UDP packet addressed
     * serverIp:53 → clientIp:clientPort and writes it into the TUN.
     * UDP checksum is 0 (legal for IPv4); the IPv4 header checksum is
     * computed properly since we are the originating "router".
     * Responses larger than the MTU are truncated with TC=1 so the client
     * knows the answer was cut.
     */
    private void writeResponse(byte[] dns, int dnsLen, int clientIp, int clientPort, int serverIp) {
        if (dns == null || dnsLen <= 12) return;
        if (dnsLen > MAX_DNS_PAYLOAD) {
            dns[2] = (byte) (dns[2] | 0x02);         // TC=1 — truncated (DNS flag)
            dnsLen = MAX_DNS_PAYLOAD;
        }
        int total = 20 + 8 + dnsLen;
        byte[] pkt = new byte[total];

        // IPv4 header
        pkt[0] = 0x45;                               // version 4, IHL 5
        pkt[1] = 0;                                  // ToS
        pkt[2] = (byte) (total >> 8);
        pkt[3] = (byte) total;
        int id = ipId.getAndIncrement() & 0xFFFF;
        pkt[4] = (byte) (id >> 8);
        pkt[5] = (byte) id;
        pkt[6] = 0x40;                               // DF set
        pkt[7] = 0;
        pkt[8] = 64;                                 // TTL
        pkt[9] = 17;                                 // IPPROTO_UDP
        putIp(pkt, 12, serverIp);                    // spoof the resolver the client asked
        putIp(pkt, 16, clientIp);
        int checksum = ipChecksum(pkt, 0, 20);
        pkt[10] = (byte) (checksum >> 8);
        pkt[11] = (byte) checksum;

        // UDP header
        pkt[20] = 0;
        pkt[21] = (byte) DNS_PORT;                   // source port 53
        pkt[22] = (byte) (clientPort >> 8);
        pkt[23] = (byte) clientPort;
        int udpLen = 8 + dnsLen;
        pkt[24] = (byte) (udpLen >> 8);
        pkt[25] = (byte) udpLen;
        pkt[26] = 0;
        pkt[27] = 0;                                 // checksum 0 — legal for IPv4

        System.arraycopy(dns, 0, pkt, 28, dnsLen);

        synchronized (tunWriteLock) {
            FileOutputStream out = tunOut;
            if (out == null) return;                 // tunnel went down mid-flight
            try {
                out.write(pkt);
                out.flush();
            } catch (IOException ignored) {
                // TUN closed — nothing we can (or should) do.
            }
        }
    }

    /** Packs 4 big-endian bytes at {@code off} into an int. */
    private static int packIp(byte[] buf, int off) {
        return ((buf[off] & 0xFF) << 24) | ((buf[off + 1] & 0xFF) << 16)
                | ((buf[off + 2] & 0xFF) << 8) | (buf[off + 3] & 0xFF);
    }

    /** Writes an int as 4 big-endian bytes at {@code off}. */
    private static void putIp(byte[] buf, int off, int ip) {
        buf[off] = (byte) (ip >>> 24);
        buf[off + 1] = (byte) (ip >>> 16);
        buf[off + 2] = (byte) (ip >>> 8);
        buf[off + 3] = (byte) ip;
    }

    /** Standard 16-bit ones-complement Internet checksum over a header. */
    private static int ipChecksum(byte[] buf, int off, int len) {
        long sum = 0;
        int i = off;
        int end = off + len;
        while (i + 1 < end) {
            sum += ((buf[i] & 0xFF) << 8) | (buf[i + 1] & 0xFF);
            i += 2;
        }
        if (i < end) {
            sum += (buf[i] & 0xFF) << 8;             // pad odd trailing byte
        }
        while ((sum >> 16) != 0) {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }
        return (int) (~sum & 0xFFFF);
    }

    /** Upstreams for the currently active mode (never null). */
    private String[] currentUpstreams() {
        String mode = activeMode;
        String[] upstreams = mode != null ? UPSTREAMS.get(mode) : null;
        return upstreams != null ? upstreams : UPSTREAM_FALLBACK;
    }

    // ── Counters ─────────────────────────────────────────────────────────

    /** Date key (yyyy-MM-dd) so every counter resets itself at midnight. */
    public static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    public static long getBlockedToday(Context context) {
        return prefs(context).getLong(COUNTER_PREFIX_BLOCKED + todayKey(), 0);
    }

    public static long getTotalToday(Context context) {
        return prefs(context).getLong(COUNTER_PREFIX_TOTAL + todayKey(), 0);
    }

    /** Re-seeds the in-memory counters from today's persisted values. */
    private void loadCounters() {
        counterDate = todayKey();
        blockedToday = prefs(this).getLong(COUNTER_PREFIX_BLOCKED + counterDate, 0);
        totalToday = prefs(this).getLong(COUNTER_PREFIX_TOTAL + counterDate, 0);
        lastPersistAt = SystemClock.elapsedRealtime();
        queriesSincePersist = 0;
    }

    private void countTotal() {
        totalToday++;
        maybePersistCounters();
    }

    private void countBlocked() {
        blockedToday++;
        maybePersistCounters();
    }

    /**
     * Persists the day counters at most every 10 s / 100 queries (the hot
     * path stays light; up to that window of stats can be lost on a hard
     * process kill — an accepted trade-off). Midnight rollover resets both
     * counters under the new date key.
     */
    private void maybePersistCounters() {
        String today = todayKey();
        if (!today.equals(counterDate)) {
            counterDate = today;
            totalToday = 0;
            blockedToday = 0;
        }
        queriesSincePersist++;
        long now = SystemClock.elapsedRealtime();
        if (queriesSincePersist >= PERSIST_EVERY_N || now - lastPersistAt >= PERSIST_INTERVAL_MS) {
            lastPersistAt = now;
            queriesSincePersist = 0;
            persistCountersNow();
        }
    }

    /** Final flush (onDestroy) so a clean stop loses nothing. */
    private void persistCountersNow() {
        try {
            prefs(this).edit()
                    .putLong(COUNTER_PREFIX_TOTAL + counterDate, totalToday)
                    .putLong(COUNTER_PREFIX_BLOCKED + counterDate, blockedToday)
                    .apply();
        } catch (RuntimeException ignored) {
            // Counter persistence must never take the filter down.
        }
    }

    // ── Settings store (shared with ContentGuardPlugin) ──────────────────

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Persisted mode ("family"|"security"|"ads"|"custom") or null. */
    public static String getMode(Context context) {
        String mode = prefs(context).getString(KEY_MODE, null);
        return mode != null && UPSTREAMS.containsKey(mode) ? mode : null;
    }

    public static void setMode(Context context, String mode) {
        prefs(context).edit().putString(KEY_MODE, mode).apply();
    }

    /** Marks that the system VPN-consent dialog is awaiting the user. */
    public static void setPendingConsent(Context context, boolean pending) {
        prefs(context).edit().putBoolean(KEY_PENDING_CONSENT, pending).apply();
    }

    public static List<String> getBlockList(Context context) {
        return readRuleList(context, KEY_BLOCK);
    }

    public static List<String> getAllowList(Context context) {
        return readRuleList(context, KEY_ALLOW);
    }

    /** Persists both rule lists as JSON arrays (normalized: trimmed, lowercase). */
    public static void setRules(Context context, List<String> block, List<String> allow) {
        prefs(context).edit()
                .putString(KEY_BLOCK, new JSONArray(normalize(block)).toString())
                .putString(KEY_ALLOW, new JSONArray(normalize(allow)).toString())
                .apply();
    }

    /**
     * Pushes freshly persisted rules into a RUNNING service: a volatile
     * reference swap on the reader thread — no tunnel restart needed.
     */
    public static void pushRulesIfRunning(Context context) {
        DnsVpnService svc = instance;
        if (svc != null) {
            svc.loadRulesFromPrefs();
        }
    }

    private static List<String> readRuleList(Context context, String key) {
        List<String> out = new ArrayList<>();
        if (context == null) return out;
        try {
            JSONArray arr = new JSONArray(prefs(context).getString(key, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                out.add(arr.optString(i, ""));
            }
        } catch (JSONException ignored) {
            // Corrupt store — behave as if the list were empty.
        }
        return out;
    }

    private static String[] readRuleArray(Context context, String key) {
        List<String> list = readRuleList(context, key);
        return list.toArray(new String[0]);
    }

    private static List<String> normalize(List<String> rules) {
        List<String> out = new ArrayList<>();
        if (rules == null) return out;
        for (String rule : rules) {
            if (rule == null) continue;
            String normalized = rule.trim().toLowerCase(Locale.US);
            if (!normalized.isEmpty()) out.add(normalized);
        }
        return out;
    }

    // ── Start / stop helpers (used by ContentGuardPlugin) ────────────────

    /** Starts (or re-syncs) the filter as a foreground service. */
    public static void startVpn(Context context) {
        Intent intent = new Intent(context, DnsVpnService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(context, intent);
        } else {
            context.startService(intent);
        }
    }

    /** Stops the filter and tears the tunnel down. */
    public static void stopVpn(Context context) {
        context.stopService(new Intent(context, DnsVpnService.class));
    }

    // ── Notification ─────────────────────────────────────────────────────

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "সামগ্রী নিয়ন্ত্রণ", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("সামগ্রী নিয়ন্ত্রণ (DNS ফিল্টার) চালু থাকার নোটিফিকেশন");
        nm.createNotificationChannel(channel);
    }

    /**
     * Persistent "filter running" notification with a one-tap "বন্ধ করুন"
     * action — turning the filter off must always be one tap away (a hard
     * product requirement). Tapping the body opens অভ্যাস.
     */
    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(
                this, 0, open, PendingIntent.FLAG_IMMUTABLE);

        Intent stop = new Intent(this, DnsVpnService.class).setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(
                this, 1, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                // No dense brand status icon ships with the app; a neutral
                // system "manage" glyph keeps the notification honest and light.
                .setSmallIcon(android.R.drawable.ic_menu_manage)
                .setContentTitle("সামগ্রী নিয়ন্ত্রণ চালু")
                .setContentText("অনাকাঙ্ক্ষিত সাইট আটকানো হচ্ছে")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setOnlyAlertOnce(true)
                .setContentIntent(openPi)
                .addAction(0, "বন্ধ করুন", stopPi)
                .build();
    }
}
