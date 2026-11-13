/* Page text in English and Bahasa Indonesia. */
import { DEMO, params } from './config.js';

/* ------------------------------------------------------------------ */
/* Language: English or Bahasa Indonesia. ?lang=en|id wins, then the   */
/* viewer's last choice, then the browser language.                    */
/* ------------------------------------------------------------------ */
export const LANGS = [['en', 'EN', 'English'], ['id', 'ID', 'Bahasa Indonesia']];
export const LANG_KEY = 'washReportLang';
export const I18N = {
  en: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    durUnits: ['h', 'm', 's'],
    units: { day: ['day', 'days'], document: ['document', 'documents'], bike: ['bike', 'bikes'], motorbike: ['motorbike', 'motorbikes'],
      record: ['record', 'records'], visit: ['visit', 'visits'], arrival: ['arrival', 'arrivals'], wash: ['wash', 'washes'],
      fix: ['fix', 'fixes'] },
    reasons: {},
    tabs: { summary: 'Summary', visits: 'Visit log', review: 'Review', timeline: 'Timeline', hours: 'Busy hours', durations: 'Stay times',
      zones: 'Zones', feeds: 'Feeds', now: 'Present now', cctv: 'CCTV', weekly: 'Report' },
    stayBuckets: ['under 3m', '3 to 5m', '5 to 8m', '8 to 12m', '12 to 20m', '20 to 40m', '40m or more'],

    /* page text, by data-i18n and data-i18n-label */
    title: 'Wash mat report', language: 'Language',
    signInLead: 'Sign in to see motorbike detections and washes.', googleBtn: 'Sign in with Google',
    orEmail: 'or use email and password', email: 'Email', password: 'Password', signIn: 'Sign in', signOut: 'Sign out',
    notAllowed: 'Not allowed', deniedPre: 'You are signed in as ',
    deniedPost: ', but this account is not on the access list. Ask the owner to add your email, then sign in again.',
    demoData: 'Demo data', dateRange: 'Date range', rangePresets: 'Range presets', today: 'Today', last7: 'Last 7 days',
    last30: 'Last 30 days', custom: 'Custom', fromDate: 'From date', toDate: 'To date', to: 'to', apply: 'Apply',
    refresh: 'Refresh', reports: 'Reports', shop: 'Shop',

    /* range, status line and errors */
    rangeToday: 'today', range7: 'the last 7 days', range30: 'the last 30 days', rangeCustom: (a, b) => `${a} to ${b}`,
    needDates: 'Choose a start and an end date, then press Apply.',
    startAfterEnd: 'The start date is after the end date.',
    tooManyDays: (max, n) => `Pick ${max} days or fewer (you picked ${n}).`,
    reading: n => `Reading ${plural(n, 'day')}...`,
    loading: 'Loading', fetching: range => `Fetching detections for ${range}.`, sampleData: 'sample data',
    loaded: (n, total, st, src) => `${plural(n, 'day')} in range, ${plural(total, 'document')} in view. This load read ${plural(st.read, 'day')} (${plural(st.docs, 'document')}) from ${src}; ${st.cached} from the session cache.`,
    refused: 'Firestore refused the read.', rulesBlock: 'Firestore rules block public reads',
    rulesBlockText: 'Publish rules that allow read on track_visits, then ',
    loadFailed: msg => `Could not load data: ${msg}`, readError: 'Something went wrong reading the data',
    readErrorText: 'Check your connection and the Firebase config, then ', tryAgain: 'try again',
    noChartLib: 'The chart library did not load (offline?). Tables still work.',
    noBikes: 'No motorbikes recorded',
    noBikesText: range => `Nothing was found for ${range}. Try a longer range, or check that a detector ran in that period.`,

    /* summary */
    heroWashes: (n, range) => `${n === 1 ? 'wash' : 'washes'} in ${range}`,
    heroSub: (off, n) => `${plural(off, 'bike')} parked off the mats, ${plural(n, 'bike')} seen in total.`,
    bikesSeen: 'Motorbikes seen', washes: 'Washes', offTheMats: 'Off the mats', avgStay: 'Average stay', medianStay: 'Median stay',
    dataQuality: 'Data quality:',
    noteFlagged: (n, list) => `${plural(n, 'day')} include visits that were closed after a crash or stop (${list}). Their out times are only when the bike was last seen, so durations may be short.`,
    noteLegacy: n => `${plural(n, 'record')} come from an older detector version. Visit start times and wash status were worked out from the fields that exist (a visit counts as a wash if its zone is set).`,
    washesPerDay: 'Washes per day', day: 'Day', bikes: 'Bikes', avgStayShort: 'Avg stay', median: 'Median',
    firstIn: 'First in', lastOut: 'Last out', flaggedDayTip: 'Includes visits closed after a crash or stop',

    /* visit log */
    possiblyStale: 'Possibly stale', present: 'Present', departed: 'Departed', wash: 'Wash', offMats: 'Off mats',
    csvWash: 'wash', csvOff: 'off mats',
    feed: 'Feed', allFeeds: 'All feeds', source: 'Source', allSources: 'All sources', zone: 'Zone', allZones: 'All zones',
    zoneN: z => `Zone ${z}`, noZone: 'No zone', washesOnly: 'Washes only', searchPlate: 'Search plate',
    exportCsv: 'Export CSV', showMore: 'Show more',
    matchCount: (n, shown) => `${plural(n, 'motorbike')} match${n === 1 ? 'es' : ''} the filters.${n > shown ? ` Showing the first ${shown}.` : ' Click a row to see each visit.'}`,
    cols: { date: 'Date', feed: 'Feed', bike: 'Bike', plate: 'Plate', color: 'Color', in: 'In', out: 'Out', dur: 'Stay', zone: 'Zone', type: 'Type', status: 'Status' },
    warning: 'Warning', duration: 'Duration', stillPresent: 'still present',
    closedTip: r => `Closed after a ${r}: out time and duration may be short`, closedLabel: r => `Closed after a ${r}`,
    detailNote: (sid, id, legacy) => `Session ${sid || 'unknown'}, document ${id}${legacy ? ', older record (visit rebuilt from top-level fields)' : ''}`,
    noMatches: 'No matches', noMatchesText: 'Loosen a filter to see more motorbikes.',

    /* timeline */
    tlLegendOpen: 'Still present', closedCrash: 'Closed after crash or stop',
    nothingToDraw: 'Nothing to draw', nothingToDrawText: 'These visits have no usable in time.',
    washLc: 'wash', offLc: 'off the mats', closedAfter: r => `closed after ${r}`, noZoneOff: 'No zone (off the mats)',
    notDrawn: n => `${plural(n, 'visit')} without a usable in time not drawn.`,

    /* busy hours */
    busiestHourIs: h => `Busiest hour: ${h}`,
    hoursSub: (n, h, range) => `${plural(n, 'arrival')} between ${h}:00 and ${h}:59 in ${range}. Each bike counts once per day, at its first arrival.`,
    arrivalsByHourOfDay: 'Arrivals by hour of day', arrivalsPerHour: 'Arrivals per hour', hourByWeekday: 'Hour by weekday',
    arrivals: 'Arrivals',

    /* stay times */
    skipFlagged: 'Leave out visits closed after a crash or stop',
    noFinished: 'No finished visits', noFinishedText: 'Stay times need at least one visit with an out time.',
    average: 'Average', longest: 'Longest', shortest: 'Shortest', bikesCounted: 'Bikes counted',
    howLongStay: 'How long bikes stay', stayDist: 'Stay length distribution',
    stayNote: "A bike's stay is the sum of its finished visits that day. Visits without an out time are left out.",

    /* zones */
    noZoneRecords: 'No zone records', noZoneRecordsText: range => `No zone occupancy was found for ${range}.`,
    splitByFeed: 'Split by feed', occupancies: 'Occupancies', totalOccupied: 'Total occupied',
    openTip: 'Not finished, left out of the totals', openN: n => `${n} open`,
    zonesNote: 'Occupied time counts finished occupancies only. Zone numbers from different feeds are different physical mats when split by feed.',

    /* feeds */
    feedChart: 'Washes and off-mat bikes by feed', totalsPerFeed: 'Totals per feed', sessions: 'Sessions',
    daysActive: 'Days active', flagged: 'Flagged', flaggedNote: 'Flagged means the visit was closed after a crash or a detector stop.',

    /* present now */
    checkingNow: 'Checking today for bikes still present.',
    readToday: (docs, src) => `Read today (${plural(docs, 'document')}) from ${src}.`,
    openFor: 'Open for', soFar: 'So far', heroNow: n => `${n === 1 ? 'bike' : 'bikes'} here now`,
    nowSub: (key, h) => `Based on today's records (${key}). Bikes marked present for more than ${h} hours are listed separately because the detector probably missed their departure.`,
    noneHere: 'No bikes present', noneHereText: 'Nothing is marked present right now.',

    /* cctv */
    cctvSub: s => `The camera's picture, a new one every ${s} seconds while this tab is open. Click a picture for full screen.`,
    cctvNone: 'No camera pictures yet',
    cctvNoneText: 'The first picture comes a few seconds after this tab opens. If none comes, the counting computer may be off (outside shop hours) or stopped.',
    cctvAlt: n => `Camera ${n}`, cctvLive: t => `Live, ${t}`, cctvAt: t => `Picture from ${t}`,
    cctvWaking: 'Asking the camera for a new picture...',
    cctvStale: (t, ago) => `No new picture since ${t} (${ago} ago). The counting computer may be off or stopped.`,
    cctvPaused: m => `Paused after ${m} minutes, so a forgotten tab can't use up the free Firebase quota.`,
    cctvResume: 'Keep watching',
    cctvNoWrite: 'Could not ask the camera for pictures: the Firestore rules do not allow it yet.',
    cctvDemo: 'No camera in demo data', cctvDemoText: 'The camera picture only shows with real Firebase data.',

    /* review */
    rvLead: "Check the day's bikes. Tick two or more photos of the same bike and press Same bike. Tick a bike that only parked and press Not a wash. Compare shows the ticked bikes side by side. Every fix can be undone.",
    rvPrevDay: 'Previous day', rvNextDay: 'Next day', rvLoadingDay: "Loading the day's bikes and photos.",
    rvStatus: (n, p) => `${plural(n, 'bike')} counted, ${p} with a photo.`,
    rvNoBikes: 'No bikes counted on this day', rvNoBikesText: 'Pick another day.',
    rvSame: 'Same bike', rvRemove: 'Not a wash', rvClear: 'Clear', rvSelected: n => `${n} selected`,
    rvConfirmMerge: (ids, target) => `Count ${ids} as one bike (#${target})?`,
    rvConfirmRemove: ids => `Take ${ids} out of the count (not a wash)?`,
    rvDiffSession: "These are from different cameras or counting sessions, so they can't be merged.",
    rvMergedBy: (who, when) => `merged by ${who}, ${when}`, rvRemoved: n => `Not a wash (${n})`,
    rvRemovedBy: (who, when) => `Taken out by ${who}, ${when}`, rvOwner: 'the owner', rvUndo: 'Undo',
    rvNoPhoto: 'No photo', rvPhotoAlt: id => `Bike #${id}`,
    rvStillHere: 'Still here: fix it after it leaves', rvCantFix: 'Counted from a recording: fix it on the counting computer',
    rvWaiting: n => `${plural(n, 'fix')} waiting for the counting computer. It makes them within a minute while it's on, otherwise as soon as it starts.`,
    rvWaitingBadge: 'Waiting', rvDone: 'Done: the counts are updated.', rvFailed: msg => `Couldn't make that fix: ${msg}`,
    rvSendFailed: 'Could not send the fix: the Firestore rules do not allow it yet.',
    rvDemoNote: 'Demo data: fixes only change this page.',
    rvViews: 'View', rvAllBikes: 'All bikes', rvCompare: 'Compare', rvCompareN: n => `Compare (${n})`,
    rvCompareEmpty: 'Nothing to compare yet', rvCompareHint: 'Tick two or more bikes in All bikes, then press Compare.',
    rvBack: 'Back to all bikes', rvDropCompare: 'Take out of the comparison',

    /* weekly report */
    generate: 'Generate', lastWeekBtn: 'Last week', thisWeekBtn: 'This week', totalRow: 'Total',
    needDatesReport: 'Choose a start and an end date, then press Generate.',
    downloadPdf: 'Download PDF', print: 'Print', fetchingWeek: w => `Fetching ${w}.`,
    weeklyStatus: (st, src) => `Report: read ${plural(st.read, 'day')} (${plural(st.docs, 'document')}) from ${src}; ${st.cached} from the session cache.`,
    weeklyTitle: 'Wash report', sampleNotReal: 'sample data, not real records', generated: 'Generated',
    weeklyFoot: "Totals count every motorbike detected, on the wash mats or off them. Times are the shop's local time. Stay and wash times use finished visits only.",
    weekEmpty: 'No motorbikes were recorded in this period.',
    noPrevWeek: 'No data for the period before', samePrevWeek: 'Same as the period before',
    vsPrevWeek: (d, pct) => `${d} vs the period before (${pct}%)`,
    weekFlagged: n => `${plural(n, 'visit')} ${n === 1 ? 'was' : 'were'} closed after a detector stop, so ${n === 1 ? 'its' : 'their'} stay may be shorter than it really was.`,
    weekNoOut: n => `${plural(n, 'bike')} had no departure recorded; ${n === 1 ? 'its' : 'their'} stay is left out of the times.`,
    totalWashes: 'Total washes', typicalWash: 'Typical wash time (median)', averageX: d => `Average ${d}`,
    busiestDay: 'Busiest day', noWashes: 'No washes', busiestHour: 'Busiest hour',
    inThatHour: n => `${plural(n, 'arrival')} in that hour`, noArrivals: 'No arrivals',
    daysOfN: (n, total) => `${n} of ${total}`, daysWithBikes: 'Days with bikes',
    dayTotalNote: "Number on top is the day's total.", arrivalsByHour: 'Arrivals by hour',
    oncePerDay: 'Each bike counts once per day, at its first arrival.', dayByDay: 'Day by day',
    howLongWashes: 'How long washes take', weeklyFile: 'report',
    makingPdf: 'Making PDF...', pdfLibFailed: 'the PDF tool did not load (offline?)',
    pdfSaved: f => `Saved "${f}" to your downloads.`, pdfFailed: msg => `Could not make the PDF: ${msg}. Try Print instead.`,
    printHint: 'Or press Ctrl+P. For a PDF file, use Download PDF on the report page.',

    /* collection column in the weekly report's day-by-day table */
    locale: 'en-US', collection: 'Collection', pricePerWash: 'Price per wash',
    setPrice: 'Enter the price per wash above to add the collection to the report. The price is saved in this browser only.',
    collectionNote: price => `Collection = bikes × ${price} per wash. The bike count includes every motorbike seen that day, on the wash mats or off them.`,

    /* sign-in */
    thisAccount: 'this account', signedIn: 'Signed in', enterEmailPw: 'Enter your email and password.',
    authNoMatch: 'That email and password do not match an account.',
    authTooMany: 'Too many attempts. Wait a few minutes and try again.',
    authDomain: 'This web address is not an authorised domain in Firebase. Add it under Authentication, Settings, Authorized domains.',
    authMethod: 'This sign-in method is not enabled in Firebase Authentication.',
    authNetwork: 'Network error. Check your connection and try again.',
    authFailed: msg => `Sign-in failed: ${msg}`, unknownError: 'unknown error',
    firebaseFailed: 'Could not load Firebase. Check your connection and reload.'
  },
  id: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    weekdays: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    durUnits: ['j', 'm', 'd'],
    units: { day: ['hari', 'hari'], document: ['dokumen', 'dokumen'], bike: ['motor', 'motor'], motorbike: ['motor', 'motor'],
      record: ['catatan', 'catatan'], visit: ['kunjungan', 'kunjungan'], arrival: ['kedatangan', 'kedatangan'], wash: ['motor dicuci', 'motor dicuci'],
      fix: ['perbaikan', 'perbaikan'] },
    reasons: { detector_stopped: 'detektor berhenti', recovered: 'pemulihan' },
    tabs: { summary: 'Ringkasan', visits: 'Riwayat kunjungan', review: 'Periksa', timeline: 'Linimasa', hours: 'Jam sibuk', durations: 'Durasi',
      zones: 'Zona', feeds: 'Feed', now: 'Di lokasi sekarang', cctv: 'CCTV', weekly: 'Laporan' },
    stayBuckets: ['di bawah 3m', '3 sampai 5m', '5 sampai 8m', '8 sampai 12m', '12 sampai 20m', '20 sampai 40m', '40m atau lebih'],

    title: 'Laporan cuci motor', language: 'Bahasa',
    signInLead: 'Masuk untuk melihat deteksi motor dan cucian.', googleBtn: 'Masuk dengan Google',
    orEmail: 'atau pakai email dan kata sandi', email: 'Email', password: 'Kata sandi', signIn: 'Masuk', signOut: 'Keluar',
    notAllowed: 'Tidak diizinkan', deniedPre: 'Anda masuk sebagai ',
    deniedPost: ', tetapi akun ini tidak ada di daftar akses. Minta pemilik menambahkan email Anda, lalu masuk lagi.',
    demoData: 'Data contoh', dateRange: 'Rentang tanggal', rangePresets: 'Pilihan rentang', today: 'Hari ini', last7: '7 hari',
    last30: '30 hari', custom: 'Pilih tanggal', fromDate: 'Tanggal mulai', toDate: 'Tanggal akhir', to: 'sampai', apply: 'Terapkan',
    refresh: 'Muat ulang', reports: 'Laporan', shop: 'Toko',

    rangeToday: 'hari ini', range7: 'dalam 7 hari terakhir', range30: 'dalam 30 hari terakhir', rangeCustom: (a, b) => `dari ${a} sampai ${b}`,
    needDates: 'Pilih tanggal mulai dan tanggal akhir, lalu tekan Terapkan.',
    startAfterEnd: 'Tanggal mulai jatuh setelah tanggal akhir.',
    tooManyDays: (max, n) => `Pilih paling banyak ${max} hari (Anda memilih ${n}).`,
    reading: n => `Membaca ${n} hari...`,
    loading: 'Memuat', fetching: range => `Mengambil deteksi ${range}.`, sampleData: 'data contoh',
    loaded: (n, total, st, src) => `${n} hari dalam rentang, ${total} dokumen ditampilkan. Pemuatan ini membaca ${st.read} hari (${st.docs} dokumen) dari ${src}; ${st.cached} dari cache sesi.`,
    refused: 'Firestore menolak pembacaan.', rulesBlock: 'Aturan Firestore memblokir pembacaan publik',
    rulesBlockText: 'Terbitkan aturan yang mengizinkan baca di track_visits, lalu ',
    loadFailed: msg => `Gagal memuat data: ${msg}`, readError: 'Terjadi kesalahan saat membaca data',
    readErrorText: 'Periksa koneksi dan konfigurasi Firebase, lalu ', tryAgain: 'coba lagi',
    noChartLib: 'Library grafik gagal dimuat (offline?). Tabel tetap bisa dipakai.',
    noBikes: 'Tidak ada motor tercatat',
    noBikesText: range => `Tidak ada data ${range}. Coba rentang yang lebih panjang, atau pastikan detektor berjalan pada periode itu.`,

    heroWashes: (n, range) => `motor dicuci ${range}`,
    heroSub: (off, n) => `${off} motor parkir di luar area cuci, total ${n} motor terdeteksi.`,
    bikesSeen: 'Motor terdeteksi', washes: 'Dicuci', offTheMats: 'Di luar area cuci', avgStay: 'Rata-rata durasi', medianStay: 'Median durasi',
    dataQuality: 'Kualitas data:',
    noteFlagged: (n, list) => `${n} hari berisi kunjungan yang ditutup setelah crash atau detektor berhenti (${list}). Waktu keluarnya hanya saat motor terakhir terlihat, jadi durasinya mungkin lebih pendek.`,
    noteLegacy: n => `${n} catatan berasal dari versi detektor lama. Waktu mulai kunjungan dan status cuci dihitung dari data yang tersedia (kunjungan dihitung cuci jika zonanya terisi).`,
    washesPerDay: 'Motor dicuci per hari', day: 'Hari', bikes: 'Motor', avgStayShort: 'Rata-rata durasi', median: 'Median',
    firstIn: 'Masuk pertama', lastOut: 'Keluar terakhir', flaggedDayTip: 'Berisi kunjungan yang ditutup setelah crash atau detektor berhenti',

    possiblyStale: 'Mungkin sudah pergi', present: 'Di lokasi', departed: 'Sudah pergi', wash: 'Cuci', offMats: 'Di luar area',
    csvWash: 'cuci', csvOff: 'di luar area',
    feed: 'Feed', allFeeds: 'Semua feed', source: 'Sumber', allSources: 'Semua sumber', zone: 'Zona', allZones: 'Semua zona',
    zoneN: z => `Zona ${z}`, noZone: 'Tanpa zona', washesOnly: 'Hanya yang dicuci', searchPlate: 'Cari plat nomor',
    exportCsv: 'Ekspor CSV', showMore: 'Tampilkan lebih banyak',
    matchCount: (n, shown) => `${n} motor cocok dengan filter.${n > shown ? ` Menampilkan ${shown} pertama.` : ' Klik baris untuk melihat tiap kunjungan.'}`,
    cols: { date: 'Tanggal', feed: 'Feed', bike: 'Motor', plate: 'Plat', color: 'Warna', in: 'Masuk', out: 'Keluar', dur: 'Durasi', zone: 'Zona', type: 'Jenis', status: 'Status' },
    warning: 'Peringatan', duration: 'Durasi', stillPresent: 'masih di lokasi',
    closedTip: r => `Ditutup setelah ${r}: waktu keluar dan durasi mungkin terlalu pendek`, closedLabel: r => `Ditutup setelah ${r}`,
    detailNote: (sid, id, legacy) => `Sesi ${sid || 'tidak diketahui'}, dokumen ${id}${legacy ? ', catatan lama (kunjungan disusun ulang dari data tingkat atas)' : ''}`,
    noMatches: 'Tidak ada yang cocok', noMatchesText: 'Longgarkan filter untuk melihat lebih banyak motor.',

    tlLegendOpen: 'Masih di lokasi', closedCrash: 'Ditutup setelah crash atau detektor berhenti',
    nothingToDraw: 'Tidak ada yang bisa digambar', nothingToDrawText: 'Kunjungan ini tidak punya waktu masuk yang bisa dipakai.',
    washLc: 'cuci', offLc: 'di luar area cuci', closedAfter: r => `ditutup setelah ${r}`, noZoneOff: 'Tanpa zona (di luar area cuci)',
    notDrawn: n => `${n} kunjungan tanpa waktu masuk yang bisa dipakai tidak digambar.`,

    busiestHourIs: h => `Jam tersibuk: ${h}`,
    hoursSub: (n, h, range) => `${n} kedatangan antara ${h}:00 dan ${h}:59 ${range}. Setiap motor dihitung sekali per hari, saat pertama datang.`,
    arrivalsByHourOfDay: 'Kedatangan per jam', arrivalsPerHour: 'Kedatangan per jam', hourByWeekday: 'Jam per hari dalam seminggu',
    arrivals: 'Kedatangan',

    skipFlagged: 'Abaikan kunjungan yang ditutup setelah crash atau detektor berhenti',
    noFinished: 'Belum ada kunjungan selesai', noFinishedText: 'Durasi butuh setidaknya satu kunjungan dengan waktu keluar.',
    average: 'Rata-rata', longest: 'Terlama', shortest: 'Tersingkat', bikesCounted: 'Motor dihitung',
    howLongStay: 'Berapa lama motor berada di lokasi', stayDist: 'Sebaran durasi',
    stayNote: 'Durasi motor adalah jumlah kunjungan yang selesai pada hari itu. Kunjungan tanpa waktu keluar tidak dihitung.',

    noZoneRecords: 'Tidak ada data zona', noZoneRecordsText: range => `Tidak ada data pemakaian zona ${range}.`,
    splitByFeed: 'Pisahkan per feed', occupancies: 'Pemakaian', totalOccupied: 'Total waktu terpakai',
    openTip: 'Belum selesai, tidak masuk total', openN: n => `${n} belum selesai`,
    zonesNote: 'Waktu terpakai hanya menghitung pemakaian yang sudah selesai. Jika dipisah per feed, nomor zona dari feed berbeda adalah area cuci fisik yang berbeda.',

    feedChart: 'Motor dicuci dan di luar area cuci per feed', totalsPerFeed: 'Total per feed', sessions: 'Sesi',
    daysActive: 'Hari aktif', flagged: 'Ditandai', flaggedNote: 'Ditandai berarti kunjungan ditutup setelah crash atau detektor berhenti.',

    checkingNow: 'Memeriksa motor yang masih di lokasi hari ini.',
    readToday: (docs, src) => `Membaca hari ini (${docs} dokumen) dari ${src}.`,
    openFor: 'Tercatat selama', soFar: 'Lama di lokasi', heroNow: () => 'motor di lokasi sekarang',
    nowSub: (key, h) => `Berdasarkan catatan hari ini (${key}). Motor yang tercatat di lokasi lebih dari ${h} jam ditampilkan terpisah karena detektor kemungkinan melewatkan kepergiannya.`,
    noneHere: 'Tidak ada motor di lokasi', noneHereText: 'Saat ini tidak ada motor yang tercatat di lokasi.',

    cctvSub: s => `Gambar kamera, diperbarui setiap ${s} detik selama tab ini terbuka. Klik gambar untuk layar penuh.`,
    cctvNone: 'Belum ada gambar kamera',
    cctvNoneText: 'Gambar pertama muncul beberapa detik setelah tab ini dibuka. Jika tidak muncul, komputer penghitung mungkin mati (di luar jam toko) atau berhenti.',
    cctvAlt: n => `Kamera ${n}`, cctvLive: t => `Langsung, ${t}`, cctvAt: t => `Gambar dari ${t}`,
    cctvWaking: 'Meminta gambar baru dari kamera...',
    cctvStale: (t, ago) => `Tidak ada gambar baru sejak ${t} (${ago} yang lalu). Komputer penghitung mungkin mati atau berhenti.`,
    cctvPaused: m => `Dijeda setelah ${m} menit agar tab yang terlupa tidak menghabiskan kuota gratis Firebase.`,
    cctvResume: 'Lanjut menonton',
    cctvNoWrite: 'Tidak bisa meminta gambar dari kamera: aturan Firestore belum mengizinkannya.',
    cctvDemo: 'Tidak ada kamera di data contoh', cctvDemoText: 'Gambar kamera hanya tampil dengan data Firebase asli.',

    rvLead: 'Periksa motor hari ini. Centang dua foto atau lebih dari motor yang sama, lalu tekan Motor sama. Centang motor yang hanya parkir, lalu tekan Bukan cucian. Bandingkan menampilkan motor yang dicentang berdampingan. Setiap perbaikan bisa dibatalkan.',
    rvPrevDay: 'Hari sebelumnya', rvNextDay: 'Hari berikutnya', rvLoadingDay: 'Memuat motor dan foto hari ini.',
    rvStatus: (n, p) => `${n} motor terhitung, ${p} dengan foto.`,
    rvNoBikes: 'Tidak ada motor terhitung pada hari ini', rvNoBikesText: 'Pilih hari lain.',
    rvSame: 'Motor sama', rvRemove: 'Bukan cucian', rvClear: 'Batal pilih', rvSelected: n => `${n} dipilih`,
    rvConfirmMerge: (ids, target) => `Hitung ${ids} sebagai satu motor (#${target})?`,
    rvConfirmRemove: ids => `Keluarkan ${ids} dari hitungan (bukan cucian)?`,
    rvDiffSession: 'Motor ini dari kamera atau sesi hitung yang berbeda, jadi tidak bisa digabung.',
    rvMergedBy: (who, when) => `digabung oleh ${who}, ${when}`, rvRemoved: n => `Bukan cucian (${n})`,
    rvRemovedBy: (who, when) => `Dikeluarkan oleh ${who}, ${when}`, rvOwner: 'pemilik', rvUndo: 'Batalkan',
    rvNoPhoto: 'Tidak ada foto', rvPhotoAlt: id => `Motor #${id}`,
    rvStillHere: 'Masih di lokasi: perbaiki setelah motor pergi', rvCantFix: 'Dihitung dari rekaman: perbaiki di komputer penghitung',
    rvWaiting: n => `${n} perbaikan menunggu komputer penghitung. Diproses dalam satu menit selama komputer menyala, atau begitu komputer menyala.`,
    rvWaitingBadge: 'Menunggu', rvDone: 'Selesai: hitungan sudah diperbarui.', rvFailed: msg => `Perbaikan gagal: ${msg}`,
    rvSendFailed: 'Tidak bisa mengirim perbaikan: aturan Firestore belum mengizinkannya.',
    rvDemoNote: 'Data contoh: perbaikan hanya mengubah halaman ini.',
    rvViews: 'Tampilan', rvAllBikes: 'Semua motor', rvCompare: 'Bandingkan', rvCompareN: n => `Bandingkan (${n})`,
    rvCompareEmpty: 'Belum ada yang dibandingkan', rvCompareHint: 'Centang dua motor atau lebih di Semua motor, lalu tekan Bandingkan.',
    rvBack: 'Kembali ke semua motor', rvDropCompare: 'Keluarkan dari perbandingan',

    generate: 'Buat laporan', lastWeekBtn: 'Minggu lalu', thisWeekBtn: 'Minggu ini', totalRow: 'Total',
    needDatesReport: 'Pilih tanggal mulai dan tanggal akhir, lalu tekan Buat laporan.',
    downloadPdf: 'Unduh PDF', print: 'Cetak', fetchingWeek: w => `Mengambil ${w}.`,
    weeklyStatus: (st, src) => `Laporan: membaca ${st.read} hari (${st.docs} dokumen) dari ${src}; ${st.cached} dari cache sesi.`,
    weeklyTitle: 'Laporan cuci motor', sampleNotReal: 'data contoh, bukan catatan asli', generated: 'Dibuat',
    weeklyFoot: 'Total menghitung semua motor yang terdeteksi, di area cuci maupun di luarnya. Waktu memakai jam lokal toko. Durasi dan waktu cuci hanya memakai kunjungan yang sudah selesai.',
    weekEmpty: 'Tidak ada motor tercatat pada periode ini.',
    noPrevWeek: 'Tidak ada data periode sebelumnya', samePrevWeek: 'Sama dengan periode sebelumnya',
    vsPrevWeek: (d, pct) => `${d} dibanding periode sebelumnya (${pct}%)`,
    weekFlagged: n => `${n} kunjungan ditutup setelah detektor berhenti, jadi durasinya mungkin lebih pendek dari yang sebenarnya.`,
    weekNoOut: n => `${n} motor tidak punya catatan kepergian; durasinya tidak dihitung.`,
    totalWashes: 'Total cuci', typicalWash: 'Waktu cuci umum (median)', averageX: d => `Rata-rata ${d}`,
    busiestDay: 'Hari tersibuk', noWashes: 'Tidak ada yang dicuci', busiestHour: 'Jam tersibuk',
    inThatHour: n => `${n} kedatangan pada jam itu`, noArrivals: 'Tidak ada kedatangan',
    daysOfN: (n, total) => `${n} dari ${total}`, daysWithBikes: 'Hari dengan motor',
    dayTotalNote: 'Angka di atas adalah total hari itu.', arrivalsByHour: 'Kedatangan per jam',
    oncePerDay: 'Setiap motor dihitung sekali per hari, saat pertama datang.', dayByDay: 'Per hari',
    howLongWashes: 'Lama waktu cuci', weeklyFile: 'laporan',
    makingPdf: 'Membuat PDF...', pdfLibFailed: 'alat PDF gagal dimuat (offline?)',
    pdfSaved: f => `"${f}" tersimpan di folder unduhan.`, pdfFailed: msg => `Gagal membuat PDF: ${msg}. Coba Cetak saja.`,
    printHint: 'Atau tekan Ctrl+P. Untuk file PDF, pakai Unduh PDF di halaman laporan.',

    locale: 'id-ID', collection: 'Pendapatan', pricePerWash: 'Harga per cuci',
    setPrice: 'Isi harga per cuci di atas untuk menambahkan pendapatan ke laporan. Harga hanya tersimpan di browser ini.',
    collectionNote: price => `Pendapatan = motor × ${price} per cuci. Jumlah motor mencakup setiap motor yang terlihat hari itu, di area cuci maupun di luarnya.`,

    thisAccount: 'akun ini', signedIn: 'Sudah masuk', enterEmailPw: 'Masukkan email dan kata sandi.',
    authNoMatch: 'Email dan kata sandi tidak cocok dengan akun mana pun.',
    authTooMany: 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
    authDomain: 'Alamat web ini belum terdaftar sebagai domain resmi di Firebase. Tambahkan di Authentication, Settings, Authorized domains.',
    authMethod: 'Metode masuk ini belum diaktifkan di Firebase Authentication.',
    authNetwork: 'Kesalahan jaringan. Periksa koneksi lalu coba lagi.',
    authFailed: msg => `Gagal masuk: ${msg}`, unknownError: 'kesalahan tidak diketahui',
    firebaseFailed: 'Gagal memuat Firebase. Periksa koneksi lalu muat ulang halaman.'
  }
};
export const isLang = l => LANGS.some(([id]) => id === l);
export function initialLang() {
  if (isLang(params.get('lang'))) return params.get('lang');
  try { const s = localStorage.getItem(LANG_KEY); if (isLang(s)) return s; } catch (e) { /* storage blocked */ }
  return /^(id|in)\b/i.test(navigator.language || '') ? 'id' : 'en';
}
export let LANG = initialLang(), T = I18N[LANG];
/* Switches the page text (the caller redraws what's on screen). */
export function useLang(l) {
  LANG = l; T = I18N[l];
  try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* storage blocked */ }
}
export const reasonText = r => T.reasons[r] || r.replace('_', ' ');
export const dataSrc = () => DEMO ? T.sampleData : 'Firestore';

/* Fixed page text carries data-i18n (text) or data-i18n-label (aria-label). */
export function applyStaticText() {
  document.documentElement.lang = LANG;
  document.title = T.title;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', T[el.dataset.i18nLabel]));
  document.querySelectorAll('.lang').forEach(el => {
    el.setAttribute('aria-label', T.language);
    if (!el.children.length) el.innerHTML = LANGS.map(([id, short, name]) =>
      `<button type="button" data-lang="${id}" lang="${id}" title="${name}" aria-label="${name}">${short}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === LANG));
  });
}

export const plural = (n, w) => `${n} ${T.units[w][n === 1 ? 0 : 1]}`;
