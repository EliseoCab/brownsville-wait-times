    const FEED_URL = "https://bwt.cbp.gov/api/bwtRss/HTML/44,43/42,45,44,43/42,45,43";
    // Same-origin mirror updated by GitHub Actions (backup if the Worker is down)
    const LOCAL_FEED_URL = "data/bwt.xml";
    /**
     * Hybrid primary: your Cloudflare Worker (see worker/README.md).
     * After `cd worker && npx wrangler deploy`, paste the workers.dev URL here.
     * Leave "" until deployed — the page will use free proxies + GitHub mirror.
     * Example: "https://brownsville-bwt.YOUR_SUBDOMAIN.workers.dev"
     */
    const FEED_PROXY_URL = "https://brownsville-bwt.borderwait.workers.dev";

    const LANG_KEY = "bwt-lang";
    const THEME_KEY = "bwt-theme";
    const FILTER_KEY = "bwt-filter";
    const VALID_FILTERS = ["all", "passenger", "pedestrian", "commercial", "drive"];
    const STR = {
      en: {
        pageTitle: "Brownsville Bridge Wait Times · Live CBP Estimates",
        pageDesc: "Live U.S. Customs wait times for Brownsville–Matamoros bridges: B&M (Puente Viejo), Gateway (Puente Nuevo), Veterans (Puente Los Tomates), and Los Indios (Puente Lucio Blanco) — vehicles, pedestrians, SENTRI, Ready, and commercial lanes.",
        checkingFeed: "Checking CBP feed…",
        officialData: "Official CBP data",
        eyebrow: "U.S. – Mexico Land Border · Texas",
        heroTitle: "Brownsville Port of Entry",
        lastChecked: "Last checked",
        nextAutoRefresh: "Next auto-refresh",
        statShort: "Shortest vehicle wait",
        statLong: "Longest vehicle wait",
        statShortPedestrian: "Shortest pedestrian wait",
        statLongPedestrian: "Longest pedestrian wait",
        statShortCommercial: "Shortest commercial wait",
        statLongCommercial: "Longest commercial wait",
        statLeave: "Leave Now (Vehicles)",
        statLeaveHint: "Nearest vehicle bridge",
        statLeaveNeedLoc: "Allow location for nearest-bridge leave time",
        statLeaveDenied: "Location off — enable it for a leave time",
        useMyLocation: "Use my location",
        statLeaveNoWait: "No vehicle wait at the nearest bridge",
        leaveAtBooth: "Leave at {leave} for a {booth} booth.",
        leaveDriveWait: "{bridge} · {drive} min drive + {wait} min wait + {buffer} min buffer",
        statShortHint: "Across open general lanes",
        statLongHint: "Plan extra time if needed",
        autoRefresh: "Auto-refresh · every ~5 min",
        autoRefreshTitle: "While this tab is open, re-checks live CBP about every 5 minutes (not GitHub)",
        nextCheckIn: "Next check in",
        activeOnly: "Active waits only (N/A & closed hidden)",
        crossingTimes: "Crossing times",
        crossingTimesSub: "Estimates to primary inspection booth · CBP updates about hourly",
        allPortsLink: "All U.S. ports →",
        reportWaitLink: "Report Wait Times",
        filterAll: "All",
        filterVehicles: "Vehicles",
        filterPedestrian: "Pedestrian",
        filterCommercial: "Commercial",
        filterDrive: "Drive/Walking",
        crowdTitle: "Crowd source",
        crowdSub: "Coming north from Mexico · not CBP",
        crowdCollapse: "Collapse",
        crowdExpand: "Expand crowd source",
        crowdPrivacy: "Anonymous. A wait counts only on the Mexican side, coming north into the U.S. Not sent to CBP. Deleted after 24 hours.",
        crowdNear: "Near {bridge}",
        crowdEnRoute: "En route to {bridge}",
        crowdHaveSentri: "I have SENTRI",
        crowdStillSentri: "Still have SENTRI?",
        crowdYes: "Yes",
        crowdNo: "No",
        crowdMode: "How you are crossing",
        crowdVehicles: "Vehicles",
        driveGen: "General",
        driveGenReady: "Gen / Ready",
        crowdWalking: "Walking",
        crowdBridge: "Bridge",
        crowdLane: "Lane",
        crowdMinutes: "Minutes to booth from here",
        crowdReportWait: "Report wait",
        crowdCheckIn: "Check in",
        crowdWaitBlock: "Wait time",
        crowdPinBlock: "Check in · line map",
        crowdPinHint: "Anonymous. Independent of wait times. Uses your location so others can see where the line starts. Information is deleted after 24 hours.",
        crowdThanks: "Thanks · {wait} · {bridge} {lane}",
        crowdThanksPin: "Pinned · {bridge}",
        crowdLastPin: "Last check-in: {bridge} · {lat}, {lng} · {ago}",
        crowdLastPinEmpty: "No location pins in the last 45 min.",
        crowdCenterOn: "Center on me",
        crowdNeedPicks: "Choose how you cross, a bridge, and minutes.",
        crowdNeedNorth: "Report only while coming north from Mexico. Allow location on the Mexican side of the bridge.",
        crowdBridgeAuto: "Selected from your location",
        crowdBridgeAmbiguous: "{a} and {b} are both close. Choose the bridge.",
        crowdNeedPin: "Select Vehicles or Walking, then allow location.",
        crowdPinFar: "Too far from a Brownsville bridge to pin.",
        crowdWaitHr: "{h} hr",
        crowdWaitHrMin: "{h} hr {m} min",
        crowdAvgLine: "{lane} {wait} · n={n} · {ago}",
        crowdNeedLoc: "Allow location to pin your spot, or pick a bridge.",
        crowdBusy: "Already reported this lane. Try again in 10 minutes.",
        crowdErr: "Could not send report.",
        crowdAvgs: "Traveler averages (last 45 min)",
        crowdAgo: "{n} min ago",
        crowdEmpty: "Not enough traveler reports yet.",
        crowdNoPed: "No pedestrian report at this bridge.",
        filterAria: "Filter by traffic type",
        refresh: "Refresh times",
        refreshing: "Refreshing…",
        autoRefreshing: "Auto-refreshing…",
        updated: "✓ Updated",
        failed: "Failed",
        toastOk: "Wait times updated",
        toastErr: "Could not refresh",
        toastCopied: "Copied times to clipboard",
        share: "Share",
        shareAria: "Share wait times (opens Messages, Mail, and other apps on iPhone)",
        shareTitle: "Brownsville wait times",
        shareAsOf: "Report time: ",
        disclaimer: "Wait times are CBP estimates for primary inspection. Actual delays can change quickly. This is an independent viewer of the public CBP feed and is not affiliated with CBP or DHS.",
        footerBrand: "Brownsville Border Wait Times",
        footerContactLead: "Questions? Contact",
        privacyLink: "Privacy",
        source: "Source:",
        rawRss: "Raw RSS feed",
        trustedTraveler: "Trusted Traveler",
        nearbyTitle: "Near each bridge",
        nearbySub: "Gas, food, hotels & Starbase",
        nearbyChipHint: "Amenities guide",
        nearbyAria: "Nearby amenities by bridge",
        liveCamsTitle: "Live bridge cameras",
        liveCamsSub: "Streaming views of downtown Brownsville crossings",
        liveCamsOpen: "Open COMTODO cameras →",
        liveCamsAria: "Live bridge cameras",
        liveCamOld: "B&M",
        liveCamNew: "Gateway",
        liveCamLive: "Live",
        liveCamStill: "Still",
        liveCamTap: "Tap for live",
        liveCamTapAria: "Tap for live camera",
        liveCamsCredit: "Free community cameras by",
        liveCamsChecking: "Checking cameras…",
        liveCamsOffline: "Live cameras are temporarily unavailable. You can still open them on COMTODO.",
        liveCamsPartial: "One camera is offline. Showing the available live feed.",

        hours: "Hours",
        hours24: "24 hours",
        midnight: "midnight",
        reportTime: "Report time:",
        latestReport: "Latest report:",
        bridgeUpdated: "Updated",
        xUpdatesTitle: "CBP Laredo updates",
        xUpdatesSub: "Latest posts from the Laredo Field Office",
        xUpdatesLoading: "Loading posts…",
        xUpdatesFallback: "Could not load the timeline. View posts on X.",
        borderNotice: "Border notice",
        emptyFilter: "No active wait times for this filter. N/A and closed lanes are hidden.",
        liveProxy: "Live · CBP proxy",
        liveCbp: "Live · CBP",
        liveDirect: "Live · CBP direct",
        cachedMirror: "Cached · site mirror",
        cachedGithub: "Cached · GitHub mirror",
        autoRefreshed: "auto-refreshed",
        refreshFailed: "Live · refresh failed, showing last good data",
        snapshot: "Snapshot · offline fallback",
        errorLoad: "Error · could not load wait times",
        alertSnapshot: "Showing embedded snapshot",
        alertFile: "Opened as a local file (file://). Browsers block live data this way. Use the live site, or run a local server from the project folder.",
        alertFail: "Could not load the data mirror or CBP feed. Try Refresh, or open bwt.cbp.gov.",
        atAGlance: "At a glance",
        now: "now",
        themeToLight: "Switch to light theme",
        themeToDark: "Switch to dark theme",
        install: "Install",
        installHelpTitle: "Add this page to your Home Screen",
        installHelpOk: "Got it",
        installIos1: "Tap the Share button (square with an arrow).",
        installIos2: "Scroll and tap Add to Home Screen.",
        installIos3: "Tap Add. The app icon will appear on your Home Screen.",
        installOther1: "Open your browser menu (⋮ or ⋯).",
        installOther2: "Tap Install app or Add to Home Screen.",
        installOther3: "Confirm. You can open it like any other app.",
        mexicoLabel: "México:",
        openMaps: "Open {name} in maps",
        distMi: "{n} mi",
        distKm: "{n} km",
        colBridge: "Port",
        na: "N/A",
        closed: "Closed",
        updatePending: "Update pending",
        pendingDetail: "CBP has not published a new wait estimate yet",
        lanesClosed: "Lanes closed",
        asOf: "As of",
        lanesOpen: "lane(s) open",
        lanesOf: "{open} of {total} Open",
        open: "Open",
        gen: "Gen",
        ready: "Ready",
        fastOpen: "FAST open",
        genClosed: "Gen closed",
        readyClosed: "Ready closed",
        noTrusted: "No open SENTRI lanes reported",
        noReady: "No open Ready lanes reported",
        noFast: "No open FAST lanes reported",
        pendingNoTimes: "Update pending from CBP (no new wait estimates yet)",
        generalLanes: "general lanes",
        sentri: "SENTRI",
        fast: "FAST",
        pending: "pending"
      },
      es: {
        pageTitle: "Tiempos de espera en puentes de Brownsville · Estimaciones CBP en vivo",
        pageDesc: "Tiempos de espera oficiales de CBP para los puentes Brownsville–Matamoros: B&M (Puente Viejo), Gateway (Puente Nuevo), Veterans (Puente Los Tomates) y Los Indios (Puente Lucio Blanco) — vehículos, peatones, SENTRI, Ready y comerciales.",
        checkingFeed: "Revisando datos de CBP…",
        officialData: "Datos oficiales de CBP",
        eyebrow: "Frontera terrestre EE. UU. – México · Texas",
        heroTitle: "Puerto de entrada de Brownsville",
        lastChecked: "Última revisión",
        nextAutoRefresh: "Próxima actualización",
        statShort: "Espera más corta (vehículos)",
        statLong: "Espera más larga (vehículos)",
        statShortPedestrian: "Espera más corta (peatonal)",
        statLongPedestrian: "Espera más larga (peatonal)",
        statShortCommercial: "Espera más corta (comercial)",
        statLongCommercial: "Espera más larga (comercial)",
        statLeave: "Salga ahora (Vehículos)",
        statLeaveHint: "Puente vehicular más cercano",
        statLeaveNeedLoc: "Permita la ubicación para la hora de salida",
        statLeaveDenied: "Ubicación desactivada — actívela para una hora de salida",
        useMyLocation: "Usar mi ubicación",
        statLeaveNoWait: "No hay espera vehicular en el puente más cercano",
        leaveAtBooth: "Salga a las {leave} para caseta a las {booth}.",
        leaveDriveWait: "{bridge} · {drive} min de manejo + {wait} min de espera + {buffer} min de margen",
        statShortHint: "En carriles generales abiertos",
        statLongHint: "Planea tiempo extra si hace falta",
        autoRefresh: "Auto-actualización · cada ~5 min",
        autoRefreshTitle: "Con esta pestaña abierta, vuelve a consultar CBP cada 5 minutos",
        nextCheckIn: "Próxima revisión en",
        activeOnly: "Solo esperas activas (se ocultan N/D y cerrados)",
        crossingTimes: "Tiempos de cruce",
        crossingTimesSub: "Estimaciones hasta la inspección primaria · CBP actualiza cada hora aprox.",
        allPortsLink: "Todos los puertos de EE. UU. →",
        reportWaitLink: "Reportar tiempos de espera",
        filterAll: "Todos",
        filterVehicles: "Vehículos",
        filterPedestrian: "Peatonal",
        filterCommercial: "Comercial",
        filterDrive: "En ruta/A pie",
        crowdTitle: "Reportes de viajeros",
        crowdSub: "Hacia el norte desde México · no es CBP",
        crowdCollapse: "Contraer",
        crowdExpand: "Mostrar reportes de viajeros",
        crowdPrivacy: "Anónimo. La espera cuenta solo del lado mexicano, al cruzar hacia el norte a Estados Unidos. No se envía a CBP. Se borra a las 24 horas.",
        crowdNear: "Cerca de {bridge}",
        crowdEnRoute: "En ruta a {bridge}",
        crowdHaveSentri: "Tengo SENTRI",
        crowdStillSentri: "¿Sigue teniendo SENTRI?",
        crowdYes: "Sí",
        crowdNo: "No",
        crowdMode: "Cómo cruza",
        crowdVehicles: "Vehículos",
        driveGen: "General",
        driveGenReady: "Gen / Ready",
        crowdWalking: "A pie",
        crowdBridge: "Puente",
        crowdLane: "Carril",
        crowdMinutes: "Minutos a la caseta desde aquí",
        crowdReportWait: "Reportar espera",
        crowdCheckIn: "Registrar ubicación",
        crowdWaitBlock: "Tiempo de espera",
        crowdPinBlock: "Registro · mapa de la fila",
        crowdPinHint: "Anónimo. Independiente de los minutos. Usa su ubicación para que otros vean dónde empieza la fila. La información se borra a las 24 horas.",
        crowdThanks: "Gracias · {wait} · {bridge} {lane}",
        crowdThanksPin: "Ubicación marcada · {bridge}",
        crowdLastPin: "Último registro: {bridge} · {lat}, {lng} · {ago}",
        crowdLastPinEmpty: "No hay ubicaciones en los últimos 45 min.",
        crowdCenterOn: "Centrar en mí",
        crowdNeedPicks: "Elija cómo cruza, un puente y los minutos.",
        crowdNeedNorth: "Reporte solo si viene desde México hacia el norte. Permita la ubicación del lado mexicano del puente.",
        crowdBridgeAuto: "Elegido según su ubicación",
        crowdBridgeAmbiguous: "{a} y {b} están cerca. Elija el puente.",
        crowdNeedPin: "Elija Vehículos o A pie, y permita la ubicación.",
        crowdPinFar: "Demasiado lejos de un puente de Brownsville para marcar.",
        crowdWaitHr: "{h} h",
        crowdWaitHrMin: "{h} h {m} min",
        crowdNeedLoc: "Permita la ubicación para marcar su sitio, o elija un puente.",
        crowdBusy: "Ya reportó este carril. Intente de nuevo en 10 minutos.",
        crowdErr: "No se pudo enviar el reporte.",
        crowdAvgs: "Promedios de viajeros (últimos 45 min)",
        crowdAvgLine: "{lane} {wait} · n={n} · {ago}",
        crowdAgo: "hace {n} min",
        crowdEmpty: "Aún no hay suficientes reportes de viajeros.",
        crowdNoPed: "No hay reporte peatonal en este puente.",
        filterAria: "Filtrar por tipo de tráfico",
        refresh: "Actualizar tiempos",
        refreshing: "Actualizando…",
        autoRefreshing: "Actualización automática…",
        updated: "✓ Actualizado",
        failed: "Error",
        toastOk: "Tiempos actualizados",
        toastErr: "No se pudo actualizar",
        toastCopied: "Tiempos copiados",
        share: "Compartir",
        shareAria: "Compartir tiempos de espera (abre Mensajes, Mail y otras apps en iPhone)",
        shareTitle: "Tiempos de espera en Brownsville",
        shareAsOf: "Hora del reporte: ",
        disclaimer: "Los tiempos son estimaciones de CBP para la inspección primaria. Las demoras pueden cambiar rápido. Este visor es independiente y no está afiliado a CBP ni a DHS.",
        footerBrand: "Tiempos de espera en Brownsville",
        footerContactLead: "¿Preguntas? Contacte",
        privacyLink: "Privacidad",
        source: "Fuente:",
        rawRss: "Fuente RSS",
        trustedTraveler: "Viajero de confianza",
        nearbyTitle: "Cerca de cada puente",
        nearbySub: "Gasolina, comida, hoteles y Starbase",
        nearbyChipHint: "Guía de servicios",
        nearbyAria: "Servicios cercanos por puente",
        liveCamsTitle: "Cámaras en vivo de los puentes",
        liveCamsSub: "Vistas en streaming de los cruces del centro de Brownsville",
        liveCamsOpen: "Abrir cámaras COMTODO →",
        liveCamsAria: "Cámaras en vivo de los puentes",
        liveCamOld: "Puente Viejo (B&M Express)",
        liveCamNew: "Puente Nuevo (Gateway)",
        liveCamLive: "En vivo",
        liveCamStill: "Foto",
        liveCamTap: "Toque para en vivo",
        liveCamTapAria: "Toque para cámara en vivo",
        liveCamsCredit: "Cámaras comunitarias gratis de",
        liveCamsChecking: "Revisando cámaras…",
        liveCamsOffline: "Las cámaras en vivo no están disponibles por ahora. Aún puede abrirlas en COMTODO.",
        liveCamsPartial: "Una cámara está fuera de línea. Mostrando la transmisión disponible.",

        hours: "Horario",
        hours24: "24 horas",
        midnight: "medianoche",
        reportTime: "Hora del reporte:",
        latestReport: "Último reporte:",
        bridgeUpdated: "Actualizado",
        xUpdatesTitle: "Actualizaciones CBP Laredo",
        xUpdatesSub: "Publicaciones recientes de la Oficina de Campo de Laredo",
        xUpdatesLoading: "Cargando publicaciones…",
        xUpdatesFallback: "No se pudo cargar la línea de tiempo. Ver en X.",
        borderNotice: "Aviso fronterizo",
        emptyFilter: "No hay tiempos activos para este filtro. Se ocultan N/D y cerrados.",
        liveProxy: "En vivo · proxy CBP",
        liveCbp: "En vivo · CBP",
        liveDirect: "En vivo · CBP directo",
        cachedMirror: "Guardado · copia del sitio",
        cachedGithub: "Guardado · copia de GitHub",
        autoRefreshed: "auto-actualizado",
        refreshFailed: "En vivo · falló la actualización; se muestra el último dato bueno",
        snapshot: "Instantánea · sin conexión",
        errorLoad: "Error · no se pudieron cargar los tiempos",
        alertSnapshot: "Mostrando instantánea guardada",
        alertFile: "Se abrió como archivo local (file://). Así el navegador bloquea los datos en vivo. Usa el sitio publicado o un servidor local.",
        alertFail: "No se pudo cargar la copia ni el feed de CBP. Prueba Actualizar, o abre bwt.cbp.gov.",
        atAGlance: "De un vistazo",
        now: "ahora",
        themeToLight: "Cambiar a modo claro",
        themeToDark: "Cambiar a modo oscuro",
        install: "Instalar",
        installHelpTitle: "Agrega esta página a tu pantalla de inicio",
        installHelpOk: "Entendido",
        installIos1: "Toca el botón Compartir (cuadrado con flecha).",
        installIos2: "Desplázate y toca Agregar a pantalla de inicio.",
        installIos3: "Toca Agregar. El ícono aparecerá en tu pantalla de inicio.",
        installOther1: "Abre el menú del navegador (⋮ o ⋯).",
        installOther2: "Toca Instalar app o Agregar a pantalla de inicio.",
        installOther3: "Confirma. Podrás abrirla como cualquier otra app.",
        mexicoLabel: "México:",
        openMaps: "Abrir {name} en mapas",
        distMi: "{n} mi",
        distKm: "{n} km",
        colBridge: "Puerto",
        na: "N/D",
        closed: "Cerrado",
        updatePending: "Actualización pendiente",
        pendingDetail: "CBP aún no ha publicado una nueva estimación",
        lanesClosed: "Carriles cerrados",
        asOf: "A las",
        lanesOpen: "carril(es) abierto(s)",
        lanesOf: "{open} de {total} Abiertos",
        open: "Abiertos",
        gen: "Gen",
        ready: "Ready",
        fastOpen: "FAST abiertos",
        genClosed: "Gen cerrado",
        readyClosed: "Ready cerrado",
        noTrusted: "No hay carriles SENTRI abiertos",
        noReady: "No hay carriles Ready abiertos",
        noFast: "No hay carriles FAST abiertos",
        pendingNoTimes: "Actualización pendiente de CBP (aún no hay estimaciones)",
        generalLanes: "carriles generales",
        sentri: "SENTRI",
        fast: "FAST",
        pending: "pendiente"
      }
    };

    let currentLang = "en";
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang === "es" || savedLang === "en") currentLang = savedLang;
    } catch (_) { /* ignore */ }

    function t(key) {
      return (STR[currentLang] && STR[currentLang][key]) || STR.en[key] || key;
    }

    const NOTICE_ES = {
      "the pedestrian dedicated lane is now operational at gateway bridge and may be used with a valid u.s. passport or sentri card.":
        "El carril peatonal dedicado ya está en operación en el Puente Gateway y puede usarse con un pasaporte de EE. UU. válido o una tarjeta SENTRI.",
      "pedestrian access closes at 10:00 pm and reopens at 6:00 am, seven days a week. the closest pedestrian crossing is gateway bridge.":
        "El acceso peatonal cierra a las 10:00 p.m. y reabre a las 6:00 a.m., los siete días de la semana. El cruce peatonal más cercano es el Puente Gateway."
    };

    function noticeKey(text) {
      return String(text || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    function translateNotice(text) {
      const cleaned = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!cleaned) return "";
      if (currentLang !== "es") return cleaned;
      const exact = NOTICE_ES[noticeKey(cleaned)];
      if (exact) return exact;
      let s = cleaned;
      const pairs = [
        [/Pedestrian Dedicated Lane/gi, "carril peatonal dedicado"],
        [/Ready Lanes?/gi, "carril Ready"],
        [/SENTRI card/gi, "tarjeta SENTRI"],
        [/valid U\.S\. passport/gi, "pasaporte de EE. UU. válido"],
        [/Gateway Bridge/gi, "Puente Gateway"],
        [/seven days a week/gi, "los siete días de la semana"],
        [/Monday through Thursday/gi, "de lunes a jueves"],
        [/Monday through Friday/gi, "de lunes a viernes"],
        [/Saturday\/Sunday Closed/gi, "sábado y domingo cerrado"],
        [/is now operational/gi, "ya está en operación"],
        [/may be used with/gi, "puede usarse con"],
        [/is available from/gi, "está disponible de"],
        [/is open from/gi, "está abierto de"],
        [/until MIDNIGHT/gi, "hasta medianoche"],
        [/until midnight/gi, "hasta medianoche"],
        [/for more information/gi, "para más información"],
        [/Tune in to/gi, "Sintonice"],
        [/for border crossing information/gi, "para información de cruce fronterizo"],
        [/The closest pedestrian crossing is/gi, "El cruce peatonal más cercano es"],
        [/Pedestrian access closes at/gi, "El acceso peatonal cierra a las"],
        [/and reopens at/gi, "y reabre a las"],
        [/More at:/gi, "Más en:"],
        [/Go to/gi, "Visite"],
        [/construction that may cause some delays/gi, "obras que pueden causar demoras"],
        [/southbound lanes/gi, "carriles hacia el sur"]
      ];
      for (let i = 0; i < pairs.length; i++) s = s.replace(pairs[i][0], pairs[i][1]);
      return s;
    }



    const PORT_META = {
      "Brownsville - B&M": {
        short: "B&M",
        aka: "Brownsville & Matamoros Bridge; Puente Internacional B&M; Puente Internacional Brownsville-Matamoros; Puente Viejo",
        mx: "Puente Viejo",
        mapsQuery: "Brownsville and Matamoros Bridge 1300 Mexico Blvd Brownsville TX",
        blurb: "Downtown pedestrian-friendly crossing linking Brownsville and Matamoros.",
        lat: 25.899,
        lng: -97.497
      },
      "Brownsville - Gateway": {
        short: "Gateway",
        aka: "International Gateway Bridge; Puente Internacional Gateway; Puente Nuevo",
        mx: "Puente Nuevo",
        mapsQuery: "International Gateway Bridge 510 E 14th St Brownsville TX",
        blurb: "Primary downtown vehicle & pedestrian bridge—often the busiest corridor.",
        lat: 25.9017,
        lng: -97.4975
      },
      "Brownsville - Los Indios": {
        short: "Los Indios",
        aka: "Free Trade Bridge; Puente Internacional Lucio Blanco–Los Indios; Puente Lucio Blanco; Puente Internacional Libre Comercio; Puente Los Indios",
        mx: "Puente Los Indios",
        mapsQuery: "Free Trade Bridge 100 S Los Indios Blvd TX",
        blurb: "West-side free trade bridge with commercial focus and typically lighter passenger traffic.",
        lat: 26.048,
        lng: -97.738
      },
      "Brownsville - Veterans International": {
        short: "Veterans",
        aka: "Veterans Bridge at Los Tomates; Puente Los Tomates; Puente Internacional de Veteranos en Los Tomates; Puente Ignacio Zaragoza; Puerta Matamoros III",
        mx: "Puente Los Tomates",
        mapsQuery: "Veterans Bridge at Los Tomates 3300 S Expressway 77 83 Brownsville TX",
        blurb: "Major expressway connection (US‑77/83) with commercial, passenger, and SENTRI options.",
        lat: 25.882,
        lng: -97.478
      }
    };

    const FALLBACK_RSS = `<?xml version='1.0' encoding='UTF-8'?><rss version='2.0'><channel><title>CBP Border Wait Times</title><link>https://bwt.cbp.gov</link><description>Estimated wait times for reaching the primary inspection booth, the first point of contact with CBP when crossing the Canada/U.S. and Mexico/U.S. land borders. Each border location updates its estimated wait times hourly. </description><pubDate>Wed, 12 Aug 2026 16:16:00 EST</pubDate><item><title>Brownsville - B&amp;M</title><description>Hours: 24 hrs/day <br/> Date: 8/12/2026 <br/> <h4><b> Passenger Vehicles </b></h4>  Maximum Lanes: 4 <br/>General Lanes: At 3:00 pm CDT 60 min delay 1 lane(s) open  <br/>Sentri Lanes:  N/A  <br/>Ready Lanes: At 3:00 pm CDT 60 min delay 3 lane(s) open  <br/> <h4><b> Pedestrian </b></h4>  Maximum Lanes: 2 <br/>General Lanes: At 3:00 pm CDT 30 min delay 1 lane(s) open  <br/>Ready Lanes:  N/A  <br/></description><link>https://bwt.cbp.gov/ViewAllPorts</link><pubDate>Wed, 12 Aug 2026 16:16:00 EST</pubDate><guid>https://bwt.cbp.gov/ViewAllPorts</guid></item><item><title>Brownsville - Gateway</title><description>Hours: 24 hrs/day <br/> Date: 8/12/2026 <br/> <h4><b> Passenger Vehicles </b></h4>  Maximum Lanes: 5 <br/>General Lanes: At 3:00 pm CDT 30 min delay 1 lane(s) open  <br/>Sentri Lanes:  N/A  <br/>Ready Lanes: At 3:00 pm CDT 30 min delay 3 lane(s) open  <br/> <h4><b> Pedestrian </b></h4>  Maximum Lanes: 5 <br/>General Lanes: At 3:00 pm CDT 25 min delay 2 lane(s) open  <br/>Ready Lanes:  Lanes Closed  <br/><b>Border Notice: </b>Ready Lane is now operational at Gateway Bridge - Lane 1.  Tune in to AM 1610 for border crossing information.</description><link>https://bwt.cbp.gov/ViewAllPorts</link><pubDate>Wed, 12 Aug 2026 16:16:00 EST</pubDate><guid>https://bwt.cbp.gov/ViewAllPorts</guid></item><item><title>Brownsville - Los Indios</title><description>Hours: 6 am-10 pm <br/> Date: 8/12/2026 <br/> <h4><b> Commercial Vehicles </b></h4>  Maximum Lanes: 4 <br/>General Lanes: At 3:00 pm CDT 0 min delay 1 lane(s) open  <br/>Fast Lanes:  Lanes Closed  <br/> <h4><b> Passenger Vehicles </b></h4>  Maximum Lanes: 4 <br/>General Lanes: At 3:00 pm CDT 5 min delay 2 lane(s) open  <br/>Sentri Lanes:  N/A  <br/>Ready Lanes:  Lanes Closed  <br/></description><link>https://bwt.cbp.gov/ViewAllPorts</link><pubDate>Wed, 12 Aug 2026 16:16:00 EST</pubDate><guid>https://bwt.cbp.gov/ViewAllPorts</guid></item><item><title>Brownsville - Veterans International</title><description>Hours: 6 am-Midnight <br/> Date: 8/12/2026 <br/> <h4><b> Commercial Vehicles </b></h4>  Maximum Lanes: 4 <br/>General Lanes: At 3:00 pm CDT 45 min delay 2 lane(s) open  <br/>Fast Lanes: At 3:00 pm CDT 0 min delay 1 lane(s) open  <br/> <h4><b> Passenger Vehicles </b></h4>  Maximum Lanes: 8 <br/>General Lanes: At 3:00 pm CDT 60 min delay 1 lane(s) open  <br/>Sentri Lanes: At 3:00 pm CDT 5 min delay 2 lane(s) open  <br/>Ready Lanes: At 3:00 pm CDT 60 min delay 1 lane(s) open  <br/> <h4><b> Pedestrian </b></h4>  Maximum Lanes: 1 <br/>General Lanes: At 3:00 pm CDT 0 min delay 1 lane(s) open  <br/>Ready Lanes:  N/A  <br/></description><link>https://bwt.cbp.gov/ViewAllPorts</link><pubDate>Wed, 12 Aug 2026 16:16:00 EST</pubDate><guid>https://bwt.cbp.gov/ViewAllPorts</guid></item></channel></rss>`;

    let currentFilter = "all";
    try {
      const savedFilter = localStorage.getItem(FILTER_KEY);
      if (VALID_FILTERS.indexOf(savedFilter) >= 0) currentFilter = savedFilter;
    } catch (e) { /* private mode */ }
    let lastData = null;
    let lastXmlText = null;
    let lastSourceId = null;
    let userGeo = null; // { lat, lng, acc, heading } | "denied" | null
    const geoStore = window.BwtGeo ? window.BwtGeo.createStore(localStorage) : null;
    let geoOptInVisible = false;
    let geoInFlight = null;
    const LEAVE_BUFFER_MIN = 5;
    let lastIsLive = false;
    let lastFromAuto = false;
    let refreshTimer = null;
    let countdownTimer = null;
    let nextRefreshAt = null;
    let isLoading = false;
    let deferredInstallPrompt = null;

    function isActiveWait(w) {
      // Real numeric wait estimates only
      return w && w.minutes != null;
    }

    function isShowableWait(w) {
      // Show numeric waits and CBP "Update Pending" (not N/A / closed)
      return w && (w.minutes != null || w.pending);
    }

    // While the tab is open, re-check live CBP (does not depend on GitHub Actions)
    const CLIENT_REFRESH_MS = 5 * 60 * 1000;

    /** Next client-side refresh (not tied only to :05 past the hour). */
    function getNextClientRefreshAt() {
      return Date.now() + CLIENT_REFRESH_MS;
    }

    function formatCountdown(msLeft) {
      const sec = Math.max(0, Math.ceil(msLeft / 1000));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) {
        return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      }
      return m + ":" + String(s).padStart(2, "0");
    }

    function formatClockTime(ts) {
      return new Date(ts).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit"
      });
    }

    function updateCountdown() {
      const a = document.getElementById("nextRefresh");
      const b = document.getElementById("nextRefreshInline");
      if (!nextRefreshAt) {
        if (a) a.textContent = "—";
        if (b) b.textContent = "—";
        return;
      }
      const msLeft = nextRefreshAt - Date.now();
      if (msLeft <= 0) {
        if (a) a.textContent = t("now");
        if (b) b.textContent = t("now");
        return;
      }
      const countdown = formatCountdown(msLeft);
      if (a) a.textContent = countdown;
      if (b) b.textContent = countdown;
    }

    function scheduleAutoRefresh() {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (countdownTimer) clearInterval(countdownTimer);

      nextRefreshAt = getNextClientRefreshAt();
      const delay = Math.max(1000, nextRefreshAt - Date.now());

      refreshTimer = setTimeout(() => {
        if (document.visibilityState === "visible") {
          loadData(true);
        } else {
          // Tab hidden: wait, then try again later
          scheduleAutoRefresh();
        }
      }, delay);

      countdownTimer = setInterval(updateCountdown, 1000);
      updateCountdown();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && nextRefreshAt && Date.now() >= nextRefreshAt) {
        loadData(true);
      }
    });

    function decodeHtml(html) {
      const t = document.createElement("textarea");
      t.innerHTML = html;
      return t.value;
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    /** Site-wide wait tone: green ≤20, amber ≤45, red above 45. */
    function waitClass(minutes) {
      if (minutes == null) return "na";
      if (minutes <= 20) return "low";
      if (minutes <= 45) return "med";
      return "high";
    }

    function waitToneClass(minutes) {
      const cls = waitClass(minutes);
      if (cls === "low") return "good";
      if (cls === "med") return "warn";
      if (cls === "high") return "bad";
      return "";
    }

    function parseWait(text) {
      const raw = (text || "").trim();
      const base = {
        minutes: null, num: t("na"), unit: "", label: t("na"), cls: "na",
        pending: false, closed: false, detail: "", asOf: "—", lanesOpen: "—", lanesOpenCount: null, bar: 0
      };
      if (!raw || /^N\/A$/i.test(raw)) return { ...base };
      if (/update\s*pending/i.test(raw)) {
        return {
          ...base,
          num: t("updatePending"),
          label: t("updatePending"),
          cls: "pending",
          pending: true,
          detail: t("pendingDetail")
        };
      }
      if (/lanes?\s*closed/i.test(raw)) {
        return {
          ...base,
          num: t("closed"),
          label: t("closed"),
          detail: t("lanesClosed"),
          lanesOpen: t("closed"),
          closed: true
        };
      }
      // Prefer delay minutes (e.g. "60 min delay"), not clock fragments
      const minMatch = raw.match(/(\d+)\s*min(?:ute)?s?\s*delay/i) || raw.match(/(\d+)\s*min\b/i);
      // CBP usually sends "At 3:00 pm CDT"; around midday/midnight it often sends "At Noon CDT" / "At Midnight CDT"
      const timeMatch = raw.match(/At\s+(.+?)\s+(?=\d+\s*min)/i);
      // Require "open" so we never confuse Maximum Lanes / "Lane 1" notice text
      const lanesMatch = raw.match(/(\d+)\s*lane(?:s|\(s\))?\s*open/i);
      if (minMatch) {
        const mins = parseInt(minMatch[1], 10);
        const when = timeMatch ? normalizeCbpClock(timeMatch[1].trim()) : "";
        const openCount = lanesMatch ? parseInt(lanesMatch[1], 10) : null;
        const lanesOpen = openCount != null ? openCount + " " + t("open") : "—";
        const detail = [
          when ? t("asOf") + " " + when : "",
          openCount != null ? openCount + " " + t("lanesOpen") : ""
        ].filter(Boolean).join(" · ");
        return {
          minutes: mins,
          num: String(mins),
          unit: "min",
          label: mins + " min",
          cls: waitClass(mins),
          pending: false,
          detail,
          asOf: when || "—",
          lanesOpen,
          lanesOpenCount: openCount,
          bar: Math.min(100, (mins / 120) * 100)
        };
      }
      return {
        ...base,
        num: raw.length > 24 ? raw.slice(0, 24) + "…" : raw,
        label: raw
      };
    }

    function waitCellHtml(w) {
      if (w.minutes == null) {
        return `<span class="wait-cell ${w.cls}" aria-label="${escapeHtml(w.label)}"><span class="num">${escapeHtml(w.num)}</span></span>`;
      }
      return `<span class="wait-cell ${w.cls}" aria-label="${escapeHtml(w.label)} wait"><span class="num">${escapeHtml(w.num)}</span><span class="unit">Min</span></span>`;
    }

    function modeKey(title) {
      const t = title.toLowerCase();
      if (t.includes("pedestrian")) return "pedestrian";
      if (t.includes("commercial")) return "commercial";
      if (t.includes("passenger")) return "passenger";
      return "other";
    }

    /** RSS embeds HTML inside <description>; XML parsers turn tags into child nodes. */
    function getDescriptionMarkup(descEl) {
      if (!descEl) return "";
      const hasElementChildren = [...descEl.childNodes].some((n) => n.nodeType === 1);
      if (hasElementChildren) {
        return Array.from(descEl.childNodes)
          .map((n) => {
            if (n.nodeType === 3 || n.nodeType === 4) return n.textContent || "";
            return new XMLSerializer().serializeToString(n);
          })
          .join("");
      }
      return descEl.textContent || "";
    }

    function extractLanesFromBlock(block) {
      const lanes = [];
      // Stop at next lane type, max-lanes, section title, or border notice (prevents bleed)
      const laneRe = /(General Lanes|Sentri Lanes|Ready Lanes|Fast Lanes)\s*:\s*([^]*?)(?=(?:General|Sentri|Ready|Fast) Lanes\s*:|Maximum Lanes|Passenger Vehicles|Pedestrian|Commercial Vehicles|Border Notice|$)/gi;
      let m;
      while ((m = laneRe.exec(block)) !== null) {
        let value = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        // Drop accidental duplicate of the same lane line (XML/HTML double serialization)
        const dup = value.match(/^(At\s+.+?\d+\s*min(?:ute)?s?\s*delay\s+\d+\s*lane(?:s|\(s\))?\s*open)\b/i);
        if (dup) value = dup[1];
        // Deduplicate identical lanes (same name + same wait text) later by name preference
        lanes.push({
          name: m[1].replace(/\s+Lanes$/i, " Lane"),
          wait: parseWait(value),
          rawValue: value
        });
      }
      // Keep first occurrence of each lane name within a section
      const seen = new Set();
      const unique = lanes.filter((l) => {
        const key = l.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return sortLanes(unique);
    }

    function laneSortRank(name) {
      const n = String(name || "").toLowerCase();
      if (/general/.test(n)) return 0;
      if (/ready/.test(n)) return 1;
      if (/sentri/.test(n)) return 2;
      if (/nexus/.test(n)) return 3;
      if (/fast/.test(n)) return 4;
      return 5;
    }

    function sortLanes(lanes) {
      return (lanes || []).slice().sort(function (a, b) {
        return laneSortRank(a.name) - laneSortRank(b.name);
      });
    }

    /** Visible lane-type label: always Gen, Ready, SENTRI (never gen / ready / Sentri). */
    function laneTypeLabel(name) {
      const n = String(name || "").toLowerCase();
      if (/ready/.test(n)) return t("ready");
      if (/sentri/.test(n)) return t("sentri");
      if (/nexus/.test(n)) return "NEXUS";
      if (/fast/.test(n)) return t("fast");
      if (/general/.test(n)) return t("gen");
      return name || "";
    }

    function parseDescription(markup) {
      const text = decodeHtml(markup || "");
      const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      const hoursMatch = plain.match(/Hours:\s*([^]+?)(?=\s+Date:|$)/i) || text.match(/Hours:\s*([^<]+)/i);
      const dateMatch = plain.match(/Date:\s*([0-9/\-]+)/i) || text.match(/Date:\s*([^<]+)/i);

      const sections = [];

      // Prefer HTML section splits (when tags are preserved)
      const htmlParts = text.split(/<h4(?:\s[^>]*)?><b>\s*/i).slice(1);
      if (htmlParts.length) {
        for (const part of htmlParts) {
          const titleEnd = part.search(/<\/b>\s*<\/h4>/i);
          if (titleEnd < 0) continue;
          const title = part.slice(0, titleEnd).replace(/<[^>]+>/g, "").trim();
          const body = part.slice(titleEnd).replace(/^<\/b>\s*<\/h4>/i, "");
          const bodyClean = body.split(/Border Notice:/i)[0];
          const maxMatch = bodyClean.match(/Maximum Lanes:\s*(\d+)/i);
          sections.push({
            title,
            key: modeKey(title),
            maxLanes: maxMatch ? maxMatch[1] : null,
            lanes: extractLanesFromBlock(bodyClean)
          });
        }
      }

      // Plain-text fallback (browser XML parse strips tags into text nodes only)
      if (!sections.length) {
        const sectionRe = /(Passenger Vehicles|Pedestrian|Commercial Vehicles)\s*(.*?)(?=(?:Passenger Vehicles|Pedestrian|Commercial Vehicles|Border Notice:)|$)/gi;
        let sm;
        while ((sm = sectionRe.exec(plain)) !== null) {
          const title = sm[1].trim();
          const body = sm[2];
          const maxMatch = body.match(/Maximum Lanes:\s*(\d+)/i);
          const lanes = extractLanesFromBlock(body);
          if (lanes.length || maxMatch) {
            sections.push({
              title,
              key: modeKey(title),
              maxLanes: maxMatch ? maxMatch[1] : null,
              lanes
            });
          }
        }
      }

      let notice = null;
      const n = plain.match(/Border Notice:\s*(.+)/i);
      if (n) notice = n[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      return {
        hours: hoursMatch ? hoursMatch[1].trim() : "—",
        date: dateMatch ? dateMatch[1].trim() : "—",
        sections,
        notice
      };
    }

    function parseRss(xmlText) {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      const channel = doc.querySelector("channel");
      const pubDate = channel?.querySelector("pubDate")?.textContent?.trim() || "—";
      const items = [...doc.querySelectorAll("item")].map((item) => {
        let title = item.querySelector("title")?.textContent?.trim() || "Unknown";
        title = title.replace(/\s+/g, " ");
        // Normalize &amp; from feed titles for PORT_META lookup
        const titleKey = title
          .replace(/&amp;/g, "&")
          .replace(/&/g, "&");
        const description = getDescriptionMarkup(item.querySelector("description"));
        const parsed = parseDescription(description);
        const meta = PORT_META[titleKey] || PORT_META[title] || {
          short: titleKey.replace(/^Brownsville\s*-\s*/i, ""),
          aka: titleKey,
          mx: "",
          mapsQuery: "",
          blurb: "Brownsville Port of Entry crossing."
        };
        const passengerGeneral = findLaneMinutes(parsed.sections, "passenger", "General");
        const overallLevel = passengerGeneral != null
          ? waitClass(passengerGeneral)
          : worstLevel(parsed.sections);
        return { title: titleKey, meta, overallLevel, passengerGeneral, ...parsed };
      });
      return { pubDate, items };
    }

    function findLaneMinutes(sections, mode, laneNamePart) {
      for (const sec of sections) {
        if (sec.key !== mode) continue;
        for (const lane of sec.lanes) {
          if (lane.name.toLowerCase().includes(laneNamePart.toLowerCase()) && lane.wait.minutes != null) {
            return lane.wait.minutes;
          }
        }
      }
      return null;
    }

    function worstLevel(sections) {
      const order = { low: 1, med: 2, high: 3, severe: 3, na: 0 };
      let worst = "na";
      for (const sec of sections) {
        for (const lane of sec.lanes) {
          if (order[lane.wait.cls] > order[worst]) worst = lane.wait.cls;
        }
      }
      return worst;
    }

    function scrollFiltersToTop() {
      const el = document.querySelector(".filters");
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: "auto" });
    }

    function setFilter(filter, btn) {
      currentFilter = filter;
      try { localStorage.setItem(FILTER_KEY, filter); } catch (e) { /* private mode */ }
      syncFilterUi();
      if (lastData) {
        updateSummary(lastData);
        renderPorts(lastData);
      } else {
        applyStatCardLabels();
      }
      // After Drive/Commercial layout changes (data-view hide/show), wait for reflow
      // or scrollIntoView can run against the old page height and appear skipped.
      requestAnimationFrame(function () {
        requestAnimationFrame(scrollFiltersToTop);
      });
    }

    function syncFilterUi() {
      document.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-filter") === currentFilter);
      });
      document.documentElement.setAttribute(
        "data-view",
        currentFilter === "drive" ||
          currentFilter === "commercial" ||
          currentFilter === "passenger"
          ? currentFilter
          : ""
      );
    }

    function filterGeneralMode() {
      if (currentFilter === "pedestrian") return "pedestrian";
      if (currentFilter === "commercial") return "commercial";
      return "passenger";
    }

    function statLabelKeys() {
      if (currentFilter === "pedestrian") {
        return {
          short: "statShortPedestrian",
          long: "statLongPedestrian"
        };
      }
      if (currentFilter === "commercial") {
        return {
          short: "statShortCommercial",
          long: "statLongCommercial"
        };
      }
      return {
        short: "statShort",
        long: "statLong"
      };
    }

    function applyStatCardLabels() {
      const keys = statLabelKeys();
      const shortK = document.getElementById("statShortKicker");
      const longK = document.getElementById("statLongKicker");
      if (shortK) {
        shortK.setAttribute("data-i18n", keys.short);
        shortK.textContent = t(keys.short);
      }
      if (longK) {
        longK.setAttribute("data-i18n", keys.long);
        longK.textContent = t(keys.long);
      }
    }

    function haversineMiles(a, b) {
      const R = 3958.8;
      const toRad = function (d) { return d * Math.PI / 180; };
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
    }

    function estimateDriveMinutes(miles) {
      if (miles < 2.5) return Math.max(4, Math.round(miles * 4.2));
      if (miles < 10) return Math.round(miles * 2.5);
      return Math.max(12, Math.round(miles * 1.65));
    }

    function formatLeaveClock(date) {
      let h = date.getHours();
      const m = date.getMinutes();
      h = h % 12 || 12;
      return h + ":" + String(m).padStart(2, "0");
    }

    function passengerVehicleWait(port) {
      const summary = summarizeMode(port.sections || [], "passenger");
      if (!summary || !summary.primary || !isActiveWait(summary.primary)) return null;
      return summary.primary.minutes;
    }

    function nearestVehicleLeave(data, geo) {
      if (!data || !data.items || !geo) return null;
      let best = null;
      for (let i = 0; i < data.items.length; i++) {
        const port = data.items[i];
        const meta = port.meta || {};
        if (meta.lat == null || meta.lng == null) continue;
        const wait = passengerVehicleWait(port);
        if (wait == null) continue;
        const miles = haversineMiles(geo, { lat: meta.lat, lng: meta.lng });
        if (!best || miles < best.miles) {
          best = {
            short: meta.short || port.title,
            miles: miles,
            wait: wait,
            drive: estimateDriveMinutes(miles)
          };
        }
      }
      return best;
    }

    function updateLeaveCard(data) {
      const card = document.getElementById("leaveCard");
      const stat = document.getElementById("statLeave");
      const hint = document.getElementById("statLeaveHint");
      const kicker = card ? card.querySelector(".kicker") : null;
      if (!card || !stat || !hint) return;

      function setLeave(statText, hintText, actionable, kickerText) {
        stat.textContent = statText;
        stat.className = "stat";
        hint.textContent = hintText;
        if (kicker) kicker.textContent = kickerText || t("statLeave");
        syncGeoOptIn(!!actionable);
      }

      if (userGeo === "denied") {
        setLeave("—", t("statLeaveDenied"), geoOptInVisible);
        return;
      }
      if (!userGeo) {
        setLeave("—", t("statLeaveNeedLoc"), false);
        return;
      }
      const pick = nearestVehicleLeave(data, userGeo);
      if (!pick) {
        setLeave("—", t("statLeaveNoWait"), false);
        return;
      }
      const now = new Date();
      now.setSeconds(0, 0);
      const total = pick.drive + pick.wait + LEAVE_BUFFER_MIN;
      const booth = new Date(now.getTime() + total * 60000);
      const leaveStr = formatLeaveClock(now);
      const boothStr = formatLeaveClock(booth);
      stat.textContent = boothStr;
      stat.className = "stat " + waitToneClass(pick.wait);
      if (kicker) kicker.textContent = t("statLeave");
      hint.textContent =
        pick.short +
        " · " +
        t("leaveAtBooth").replace("{leave}", leaveStr).replace("{booth}", boothStr);
      syncGeoOptIn(false);
    }

    function syncGeoOptIn(show) {
      const btn = document.getElementById("geoOptIn");
      if (btn) btn.hidden = !show;
      const card = document.getElementById("leaveCard");
      if (card) card.classList.toggle("is-action", !!show);
    }

    function asCrowdFix(fix) {
      if (!fix || fix === "denied" || fix.lat == null || fix.lng == null) return null;
      return {
        lat: fix.lat,
        lng: fix.lng,
        acc: fix.acc == null ? null : fix.acc,
        heading: fix.heading == null ? null : fix.heading
      };
    }

    function currentGeoFix() {
      if (crowdGeo && crowdGeo.lat != null) return crowdGeo;
      return asCrowdFix(userGeo);
    }

    function publishGeoFix(fix, preserveMap) {
      const next = asCrowdFix(fix);
      if (!next) return null;
      userGeo = next;
      crowdGeo = next;
      geoOptInVisible = false;
      if (lastData) {
        updateLeaveCard(lastData);
        if (!preserveMap) renderPorts(lastData);
      }
      if (typeof crowdRefreshNear === "function") crowdRefreshNear();
      return next;
    }

    function markGeoOff(showOptIn) {
      userGeo = "denied";
      geoOptInVisible = !!showOptIn;
      if (lastData) {
        updateLeaveCard(lastData);
        renderPorts(lastData);
      } else {
        updateLeaveCard({ items: [] });
      }
      return null;
    }

    function readGeoPosition(options) {
      return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    }

    function rawGeoChoice() {
      try { return localStorage.getItem("bwt-geo-choice"); } catch (e) { return null; }
    }

    function rawGeoCache() {
      try {
        const parsed = JSON.parse(localStorage.getItem("bwt-geo-cache") || "null");
        if (!parsed || !isFinite(parsed.lat) || !isFinite(parsed.lng)) return null;
        return parsed;
      } catch (e) { return null; }
    }

    function writeRawGeo(choice, fix) {
      try {
        if (choice) localStorage.setItem("bwt-geo-choice", choice);
        if (fix) localStorage.setItem("bwt-geo-cache", JSON.stringify(fix));
      } catch (e) { /* private mode */ }
    }

    function runGeoWithoutHelper(manual, preserveMap) {
      if (!navigator.geolocation) return Promise.resolve(markGeoOff(false));
      const saved = rawGeoChoice();
      const cached = rawGeoCache();
      if (!manual && saved === "granted" && cached) return Promise.resolve(publishGeoFix(cached, preserveMap));
      if (!manual && (saved === "denied" || saved === "asked")) return Promise.resolve(markGeoOff(true));
      writeRawGeo("asked", null);
      if (userGeo === "denied") userGeo = null;
      geoOptInVisible = false;
      if (lastData) updateLeaveCard(lastData);
      return readGeoPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }).then(function (pos) {
        const coords = pos && pos.coords;
        if (!coords || !isFinite(coords.latitude) || !isFinite(coords.longitude)) return markGeoOff(true);
        const fix = {
          lat: coords.latitude,
          lng: coords.longitude,
          acc: coords.accuracy,
          heading: coords.heading,
          t: Date.now()
        };
        writeRawGeo("granted", fix);
        return publishGeoFix(fix, preserveMap);
      }, function (err) {
        writeRawGeo(err && err.code === 1 ? "denied" : "asked", null);
        return markGeoOff(true);
      });
    }

    function runGeoRequest(manual, preserveMap) {
      const bwt = window.BwtGeo;
      if (!bwt || !geoStore) {
        // geo-opt-in.js failed to load. Still ask once. A browser grant returns a fix with no dialog.
        return runGeoWithoutHelper(manual, preserveMap);
      }
      if (!manual) {
        const saved = geoStore.readChoice();
        const cached = geoStore.readCache();
        if (saved === "granted" && cached) publishGeoFix(cached, true);
        else if (saved === "denied" || saved === "asked") markGeoOff(true);
      }
      return bwt.queryPermission().then(function (permission) {
        const choice = geoStore.readChoice();
        const cached = geoStore.readCache();
        const plan = bwt.planGeoRequest({
          permission: permission,
          choice: choice,
          manual: !!manual,
          available: !!navigator.geolocation,
          cached: cached
        });
        if (plan.persist) geoStore.writeChoice(plan.persist);
        if (plan.action === "use-cache") return publishGeoFix(cached, preserveMap);
        if (plan.action === "skip") {
          if (permission !== "denied" && choice === "granted" && cached) return publishGeoFix(cached, preserveMap);
          return markGeoOff(plan.showOptIn);
        }
        geoOptInVisible = false;
        if (userGeo === "denied") userGeo = null;
        if (lastData) updateLeaveCard(lastData);
        const prompting = plan.action === "prompt";
        return readGeoPosition(prompting
          ? { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
          : { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
        ).then(function (pos) {
          const fix = bwt.fixFromPosition(pos);
          if (!fix) return markGeoOff(true);
          geoStore.writeChoice("granted");
          geoStore.writeCache(fix);
          const published = publishGeoFix(fix, preserveMap);
          if (typeof crowdRefreshNear === "function") crowdRefreshNear();
          return published;
        }, function (err) {
          const next = bwt.outcomeFromError(err, geoStore.readChoice());
          geoStore.writeChoice(next);
          if (next === "granted") {
            const again = geoStore.readCache();
            if (again) return publishGeoFix(again, preserveMap);
          }
          return markGeoOff(true);
        });
      });
    }

    function requestUserGeo(manual, opts) {
      const preserveMap = !!(opts && opts.preserveMap);
      const isManual = !!manual;
      if (geoInFlight) return geoInFlight;
      geoInFlight = Promise.resolve().then(function () {
        return runGeoRequest(isManual, preserveMap);
      }).then(function (fix) {
        geoInFlight = null;
        return fix;
      }, function () {
        geoInFlight = null;
        return null;
      });
      return geoInFlight;
    }

    function updateSummary(data) {
      applyStatCardLabels();
      const mode = filterGeneralMode();
      const generalWaits = [];

      const items = data && data.items ? data.items : [];
      for (const port of items) {
        for (const sec of port.sections) {
          for (const lane of sec.lanes) {
            if (lane.wait.minutes == null) continue;
            if (sec.key === mode && /general/i.test(lane.name) && !/sentri|ready|fast/i.test(lane.name)) {
              generalWaits.push({ mins: lane.wait.minutes, port: port.meta.short });
            }
          }
        }
      }

      const shortEl = document.getElementById("statShort");
      const longEl = document.getElementById("statLong");
      const shortHint = document.getElementById("statShortHint");
      const longHint = document.getElementById("statLongHint");

      if (generalWaits.length) {
        generalWaits.sort((a, b) => a.mins - b.mins);
        const best = generalWaits[0];
        const worst = generalWaits[generalWaits.length - 1];
        shortEl.textContent = best.mins + " min";
        shortEl.className = "stat " + waitToneClass(best.mins);
        shortHint.textContent = best.port + " · " + t("generalLanes");
        longEl.textContent = worst.mins + " min";
        longEl.className = "stat " + waitToneClass(worst.mins);
        longHint.textContent = worst.port + " · " + t("generalLanes");
      } else {
        shortEl.textContent = "—";
        shortEl.className = "stat";
        shortHint.textContent = t("statShortHint");
        longEl.textContent = "—";
        longEl.className = "stat";
        longHint.textContent = t("statLongHint");
      }

      updateLeaveCard(data);
    }

    /** Pull general wait for a traffic mode; Ready shown as an extra under that mode. */
    function summarizeMode(sections, modeKeyName) {
      const sec = sections.find((s) => s.key === modeKeyName);
      if (!sec) return null;
      const showable = sec.lanes.filter((l) => isShowableWait(l.wait));
      if (!showable.length) return null;

      // Primary: General (or first non-Ready/non-SENTRI/non-Fast showable lane)
      const nonSpecial = showable.filter((l) => !/sentri|ready|fast/i.test(l.name));
      const generalPool = nonSpecial.length ? nonSpecial : showable.filter((l) => /general/i.test(l.name));
      const ranked = (generalPool.length ? generalPool : showable).slice().sort((a, b) => {
        const aScore = (isActiveWait(a.wait) ? 2 : 0) + (/general/i.test(a.name) ? 1 : 0);
        const bScore = (isActiveWait(b.wait) ? 2 : 0) + (/general/i.test(b.name) ? 1 : 0);
        return bScore - aScore;
      });
      const primary = ranked[0];
      if (!primary) return null;

      // Ready Lanes belong with their traffic type (e.g. Gateway pedestrian Ready), not SENTRI/Fast
      const readyExtras = showable.filter((l) => /ready/i.test(l.name) && l !== primary);
      const sentriExtras = showable.filter((l) => /sentri/i.test(l.name) && l !== primary);
      const fastExtras = showable.filter((l) => /fast/i.test(l.name) && l !== primary);

      return {
        primary: primary.wait,
        primaryName: primary.name,
        extras: readyExtras.concat(sentriExtras, fastExtras),
        open: primary.wait.lanesOpen,
        max: sec.maxLanes
      };
    }

    function isGatewayPort(port) {
      const t = (port && (port.title || "")) + " " + (port && port.meta && port.meta.short ? port.meta.short : "");
      return /gateway/i.test(t);
    }

    /** Concise hours of operation for the Bridge column. */
    function formatHoursOfOperation(hours) {
      if (!hours || hours === "—") return "—";
      let h = String(hours).replace(/\s+/g, " ").trim();
      // Normalize common CBP phrases
      h = h.replace(/24\s*hrs?\/day/i, t("hours24"));
      h = h.replace(/24 hours/i, t("hours24"));
      h = h.replace(/Midnight/gi, t("midnight"));
      h = h.replace(/medianoche/gi, t("midnight"));
      h = h.replace(/\b(\d{1,2})\s*am\b/gi, (_, n) => n + " a.m.");
      h = h.replace(/\b(\d{1,2})\s*pm\b/gi, (_, n) => n + " p.m.");
      h = h.replace(/\s*-\s*/g, "–"); // en dash
      return h;
    }

    /** Commercial FAST bridges: Veterans International, Los Indios */
    function isCommercialFastPort(port) {
      const t = (port && (port.title || "")) + " " + (port && port.meta && port.meta.short ? port.meta.short : "");
      return /veterans|los\s*indios/i.test(t);
    }

    /** FAST open count for a port (null if unknown; 0 if closed / none open). */
    function fastOpenCount(port) {
      if (!port) return null;
      for (const sec of port.sections || []) {
        for (const lane of sec.lanes || []) {
          if (!/fast/i.test(lane.name)) continue;
          if (lane.wait && lane.wait.closed) return 0;
          if (lane.wait && lane.wait.lanesOpenCount != null) return lane.wait.lanesOpenCount;
        }
      }
      return null;
    }

    function sectionByKey(port, key) {
      return (port && port.sections || []).find((s) => s.key === key) || null;
    }

    /** Open booths vs CBP Maximum Lanes for one traffic type. Closed stay in the denominator. */
    function sectionOfLine(section) {
      if (!section) return "";
      let open = 0;
      let total = 0;
      let sawMax = false;
      const max = section.maxLanes != null && section.maxLanes !== "" ? Number(section.maxLanes) : NaN;
      if (!isNaN(max) && max > 0) {
        total = max;
        sawMax = true;
      }
      for (const lane of section.lanes || []) {
        const w = lane.wait;
        if (!w || w.na || w.pending) continue;
        if (w.closed) {
          if (!sawMax) total += 1;
          continue;
        }
        if (w.lanesOpenCount != null) {
          const n = Number(w.lanesOpenCount);
          if (!isNaN(n)) open += n;
        }
      }
      if (total < 1) return "";
      return t("lanesOf").replace("{open}", String(open)).replace("{total}", String(total));
    }

    /** "2 Gen, 2 Ready" or commercial "1 Gen, 1 FAST". SENTRI/NEXUS stay out of the
     *  vehicle mid-line; they still count in "{open} of {total} Open". */
    function genReadySplit(section, commercial) {
      if (!section) return "";
      const parts = [];
      const lanes = sortLanes(section.lanes || []);
      for (const lane of lanes) {
        const w = lane.wait;
        if (!w || w.na || w.pending) continue;
        const n = w.closed ? 0 : (w.lanesOpenCount != null ? Number(w.lanesOpenCount) : NaN);
        if (isNaN(n)) continue;
        if (/general/i.test(lane.name) && !/ready|sentri|fast|nexus/i.test(lane.name)) {
          parts.push(n + " " + t("gen"));
        } else if (commercial && /fast/i.test(lane.name)) {
          parts.push(n + " " + t("fast"));
        } else if (!commercial && /ready/i.test(lane.name)) {
          if (n === 0) continue;
          parts.push(n + " " + t("ready"));
        }
      }
      return parts.join(", ");
    }

    function typeOpenNote(section, nameRe, label, withOpenWord) {
      if (!section) return "";
      for (const lane of section.lanes || []) {
        if (!nameRe.test(lane.name)) continue;
        const w = lane.wait;
        if (!w || w.na || w.pending) return "";
        const n = w.closed ? 0 : (w.lanesOpenCount != null ? Number(w.lanesOpenCount) : NaN);
        if (isNaN(n)) return "";
        if (n === 0 && /ready/i.test(lane.name)) return "";
        if (withOpenWord === false) return n + " " + label;
        return n + " " + label + " " + t("open");
      }
      return "";
    }

    function tileOpenText(section, withSplit, commercial) {
      const lines = [];
      if (withSplit) {
        const split = genReadySplit(section, !!commercial);
        if (split) lines.push(split);
      }
      const ofLine = sectionOfLine(section);
      if (ofLine) lines.push(ofLine);
      return lines.join("\n");
    }

    function isCommercialGenLane(name) {
      return /general/i.test(name) && !/ready|sentri|fast|nexus/i.test(name);
    }

    function commercialSectionMax(section) {
      if (!section) return 0;
      const max = section.maxLanes != null && section.maxLanes !== "" ? Number(section.maxLanes) : NaN;
      return !isNaN(max) && max > 0 ? max : 0;
    }

    function commercialLaneOpenCount(lane) {
      const w = lane && lane.wait;
      if (!w || w.na || w.pending) return null;
      if (w.closed) return 0;
      const n = w.lanesOpenCount != null ? Number(w.lanesOpenCount) : NaN;
      return isNaN(n) ? null : n;
    }

    function commercialAllOpen(section) {
      let open = 0;
      for (const lane of section && section.lanes || []) {
        const n = commercialLaneOpenCount(lane);
        if (n != null) open += n;
      }
      return open;
    }

    function findCommercialLane(section, kind) {
      for (const lane of section && section.lanes || []) {
        if (kind === "fast") {
          if (/fast/i.test(lane.name)) return lane;
        } else if (isCommercialGenLane(lane.name)) {
          return lane;
        }
      }
      return null;
    }

    /** Commercial filter only: 3-line chips. Gen mins/count vs FAST mins/count; of-total uses commercial max. */
    function commercialFilterChip(port, kind) {
      const sec = sectionByKey(port, "commercial");
      const max = commercialSectionMax(sec);
      const lane = findCommercialLane(sec, kind);
      const ofLine = function (open) {
        if (max < 1) return "";
        return t("lanesOf").replace("{open}", String(open)).replace("{total}", String(max));
      };

      if (kind === "fast" && !lane) {
        return { html: `<span class="wait-empty">—</span>`, cls: "" };
      }

      const w = lane && lane.wait;
      const count = commercialLaneOpenCount(lane);
      const lines = [];
      let topHtml;
      let cls = "";

      const allOpen = commercialAllOpen(sec);

      if (kind === "fast" && w && w.closed) {
        const bot = ofLine(allOpen);
        return {
          html: `<div class="wait-stack"><span class="wait-empty">—</span></div>`,
          openLine: bot,
          cls: "",
          keep: true
        };
      }

      if (w && isActiveWait(w)) {
        topHtml = waitCellHtml(w);
        cls = "has-" + w.cls;
      } else if (w && w.pending) {
        topHtml = waitCellHtml(w);
        cls = "has-pending";
      } else {
        topHtml = `<span class="wait-empty">—</span>`;
      }

      if (kind === "fast") {
        if (count != null && count > 0) lines.push(count + " " + t("fast"));
      } else if (count != null) {
        lines.push(count + " " + t("gen"));
      }
      const bot = ofLine(allOpen);
      if (bot) lines.push(bot);

      return {
        html: `<div class="wait-stack">${topHtml}</div>`,
        openLine: lines.join("\n"),
        cls: cls,
        keep: true
      };
    }

    /** SENTRI / FAST / pedestrian Ready note, then the matching pool total. */
    function specialPoolOpenText(port, kind) {
      const secKey = kind === "fast" ? "commercial" : kind === "ready" ? "pedestrian" : "passenger";
      const re = kind === "fast" ? /fast/i : kind === "ready" ? /ready/i : /sentri/i;
      const label = kind === "fast" ? t("fast") : kind === "ready" ? t("ready") : t("sentri");
      const sec = sectionByKey(port, secKey);
      const lines = [];
      const note = typeOpenNote(
        sec,
        re,
        label,
        !(kind === "sentri" && (currentFilter === "passenger" || currentFilter === "all"))
      );
      if (note) lines.push(note);
      const ofLine = sectionOfLine(sec);
      if (ofLine) lines.push(ofLine);
      return lines.join("\n");
    }

    function formatOpenLine(summary, modeKey, port) {
      return sectionOfLine(sectionByKey(port, modeKey === "trusted" ? "passenger" : modeKey));
    }

    /** "Gen / Ready" or "Gen / FAST" from existing lane-type strings. */
    function combinedLaneLabel(kind) {
      return t("gen") + " / " + t(kind === "fast" ? "fast" : "ready");
    }

    function labeledWaitHtml(label, wait) {
      return `<span class="compact-pair combined-lanes"><span class="dual-label">${escapeHtml(label)}</span> ${waitCellHtml(wait)}</span>`;
    }

    function dualWaitHtml(secondLabel, primaryWait, secondWait) {
      return `<div class="compact-waits">
          <span class="compact-pair"><span class="dual-label dual-gen">${escapeHtml(t("gen"))}</span> ${waitCellHtml(primaryWait)}</span>
          <span class="compact-pair"><span class="dual-label">${escapeHtml(secondLabel)}</span> ${waitCellHtml(secondWait)}</span>
        </div>`;
    }

    /**
     * Wait pill top:
     *  - One number when Gen/Ready (or Gen/FAST) match or only one exists
     *  - "Gen 5 · Ready 12" when minutes differ — never pick only one
     * Top line is minutes only (no Closed / Pending / N/A).
     */
    function waitPillTop(summary, modeKey) {
      if (!summary) return { html: "", cls: "", dual: false };
      const w = summary.primary;
      const readyActive = (summary.extras || []).find(
        (l) => /ready/i.test(l.name) && isActiveWait(l.wait)
      );
      const fastActive = (summary.extras || []).find(
        (l) => /fast/i.test(l.name) && isActiveWait(l.wait)
      );
      const genMins = isActiveWait(w) ? w.minutes : null;
      const special = modeKey === "commercial" ? fastActive : readyActive;
      const specialMins = special && isActiveWait(special.wait) ? special.wait.minutes : null;
      const specialLab = modeKey === "commercial" ? t("fast") : t("ready");

      if (genMins != null && specialMins != null && genMins !== specialMins) {
        return {
          html: `<div class="compact-waits">
            <span class="compact-pair"><span class="dual-label dual-gen">${escapeHtml(t("gen"))}</span> <span class="wait-cell ${waitClass(genMins)}"><span class="num">${genMins}</span><span class="unit">Min</span></span></span>
            <span class="compact-pair"><span class="dual-label">${escapeHtml(specialLab)}</span> <span class="wait-cell ${waitClass(specialMins)}"><span class="num">${specialMins}</span><span class="unit">Min</span></span></span>
          </div>`,
          cls: "has-dual has-" + waitClass(Math.max(genMins, specialMins)),
          dual: true
        };
      }
      const mins = genMins != null ? genMins : specialMins;
      if (mins == null) return { html: "", cls: "", dual: false };
      return {
        html: `<span class="wait-cell ${waitClass(mins)}"><span class="num">${mins}</span><span class="unit">Min</span></span>`,
        cls: "has-" + waitClass(mins),
        dual: false
      };
    }

    function waitCellBlock(summary, modeKey, port) {
      if (currentFilter === "commercial" && modeKey === "commercial") {
        return commercialFilterChip(port, "gen");
      }
      if (!summary) {
        return { html: `<span class="wait-empty">—</span>`, cls: "" };
      }
      const top = waitPillTop(summary, modeKey);
      const sec = sectionByKey(port, modeKey);
      const withSplit = modeKey === "passenger" || modeKey === "pedestrian" || modeKey === "commercial";
      const splitIncludesFast = modeKey === "commercial" && currentFilter !== "commercial";
      const openLine = tileOpenText(sec, withSplit, splitIncludesFast);
      if (!top.html && !openLine) {
        return { html: `<span class="wait-empty">—</span>`, cls: "" };
      }
      return {
        html: `<div class="wait-stack">${top.html || ""}</div>`,
        openLine: openLine,
        cls: top.cls || ""
      };
    }

    /** Parse CBP "Date: 8/22/2026" into a local Date at midnight (or null). */
    function parseCbpDate(dateStr) {
      if (!dateStr || dateStr === "—") return null;
      const m = String(dateStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) return null;
      const month = parseInt(m[1], 10);
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }

    /** "8/22/2026" → "Aug 22, 2026" (or Spanish equivalent). */
    function formatReportDate(dateStr) {
      const d = parseCbpDate(dateStr);
      if (!d) return dateStr && dateStr !== "—" ? String(dateStr).trim() : "";
      const locale = currentLang === "es" ? "es-US" : "en-US";
      return d.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }

    /**
     * CBP clock text → stable display form.
     * "Noon CDT" / "At Noon CDT" → "12:00 pm CDT"
     * "Midnight CST" → "12:00 am CST"
     * Leaves "3:00 pm CDT" unchanged.
     */
    function normalizeCbpClock(when) {
      if (!when) return "";
      let s = String(when).replace(/^At\s+/i, "").replace(/\s+/g, " ").trim();
      const noon = s.match(/^noon\s*(C[DS]T)?$/i);
      if (noon) return "12:00 pm" + (noon[1] ? " " + noon[1].toUpperCase() : "");
      const midnight = s.match(/^midnight\s*(C[DS]T)?$/i);
      if (midnight) return "12:00 am" + (midnight[1] ? " " + midnight[1].toUpperCase() : "");
      return s;
    }

    /** Parse "3:00 pm CDT" / "12:00 pm CDT" / "Noon CDT" into minutes since midnight for ordering. */
    function asOfSortKey(asOf) {
      if (!asOf || asOf === "—") return -1;
      const normalized = normalizeCbpClock(asOf);
      if (/^noon\b/i.test(String(asOf).trim()) || /^12:00\s*pm/i.test(normalized)) return 12 * 60;
      if (/^midnight\b/i.test(String(asOf).trim()) || /^12:00\s*am/i.test(normalized)) return 0;
      const m = String(normalized).match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (!m) return -1;
      let h = parseInt(m[1], 10) % 12;
      const min = parseInt(m[2], 10);
      if (m[3].toLowerCase() === "pm") h += 12;
      return h * 60 + min;
    }

    /**
     * Newest report stamp across active lanes — date (from CBP Date:) + time (At … CDT).
     * Returns { date, time } or null.
     */
    function collectAsOf(data) {
      let best = null;
      let bestKey = -1;
      for (const port of data.items || []) {
        const stamp = collectPortAsOf(port);
        if (!stamp) continue;
        const d = parseCbpDate(stamp.date);
        const dateKey = d
          ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
          : 0;
        const timeKey = asOfSortKey(stamp.time);
        if (timeKey < 0) continue;
        const key = dateKey * 10000 + timeKey;
        if (key >= bestKey) {
          bestKey = key;
          best = stamp;
        }
      }
      return best;
    }

    /** Newest stamp for a single bridge (from its active lanes). */
    function collectPortAsOf(port) {
      if (!port) return null;
      let best = null;
      let bestKey = -1;
      const d = parseCbpDate(port.date);
      const dateKey = d
        ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
        : 0;
      for (const sec of port.sections || []) {
        for (const lane of sec.lanes || []) {
          if (!isActiveWait(lane.wait) || !lane.wait.asOf || lane.wait.asOf === "—") continue;
          const timeKey = asOfSortKey(lane.wait.asOf);
          if (timeKey < 0) continue;
          const key = dateKey * 10000 + timeKey;
          if (key >= bestKey) {
            bestKey = key;
            best = { date: port.date || "", time: lane.wait.asOf };
          }
        }
      }
      return best;
    }

    /** "Aug 22, 2026 · 5:00 am CDT" */
    function formatReportStamp(stamp) {
      if (!stamp || !stamp.time) return "—";
      const datePart = formatReportDate(stamp.date);
      if (datePart) return datePart + " · " + stamp.time;
      return stamp.time;
    }

    /** Compact per-bridge line: prefer clock time (e.g. "9:00 am CDT"). */
    function formatBridgeUpdated(stamp) {
      if (!stamp || !stamp.time) return "";
      return stamp.time;
    }

    function portHasActiveForFilter(port) {
      const modes = currentFilter === "all"
        ? ["passenger", "pedestrian", "commercial"]
        : currentFilter === "drive"
          ? ["passenger"]
          : [currentFilter];
      return modes.some((m) => summarizeMode(port.sections, m));
    }

    function isVeteransPort(port) {
      const t = (port.title || "") + " " + (port.meta && port.meta.short ? port.meta.short : "");
      return /veterans/i.test(t);
    }

    /** SENTRI open-lane count for Veterans International only. */
    function veteransSentriOpenCount(port) {
      if (!isVeteransPort(port)) return null;
      for (const sec of port.sections) {
        for (const lane of sec.lanes) {
          if (!/sentri/i.test(lane.name)) continue;
          if (lane.wait && lane.wait.lanesOpenCount != null) {
            return lane.wait.lanesOpenCount;
          }
          if (lane.wait && lane.wait.closed) return 0;
        }
      }
      return null;
    }

    /**
     * SENTRI / Ready / FAST column content:
     *  - Pedestrian filter: Ready only (do not invent data)
     *  - Veterans: SENTRI only (label + wait + open when known)
     *  - Commercial filter: FAST only (Los Indios / Veterans)
     *  - Otherwise: SENTRI or FAST, never Ready
     */
    function bestTrusted(port) {
      const commercialOnly = currentFilter === "commercial";
      const passengerOnly = currentFilter === "passenger";
      const pedestrianOnly = currentFilter === "pedestrian";
      const veteransOnlySentri = isVeteransPort(port) && !commercialOnly && !pedestrianOnly;

      let trusted = null;
      let pending = null;
      let closedPick = null;
      for (const sec of port.sections) {
        for (const lane of sec.lanes) {
          if (pedestrianOnly) {
            if (sec.key !== "pedestrian" || !/ready/i.test(lane.name)) continue;
          } else {
            if (/ready/i.test(lane.name)) continue;
            if (veteransOnlySentri) {
              if (!/sentri/i.test(lane.name)) continue;
            } else if (commercialOnly) {
              if (!/fast/i.test(lane.name)) continue;
            } else if (passengerOnly) {
              if (!/sentri/i.test(lane.name)) continue;
            } else {
              if (!/sentri|fast/i.test(lane.name)) continue;
            }
          }
          if (isActiveWait(lane.wait)) {
            if (!trusted || lane.wait.minutes < trusted.lane.wait.minutes) {
              trusted = { lane, sectionKey: sec.key, sectionTitle: sec.title };
            }
          } else if (lane.wait.pending && !pending) {
            pending = { lane, sectionKey: sec.key, sectionTitle: sec.title };
          } else if (lane.wait && lane.wait.closed && !closedPick) {
            closedPick = { lane, sectionKey: sec.key, sectionTitle: sec.title };
          }
        }
      }
      const pick = trusted || pending || closedPick;

      if (pedestrianOnly) {
        const lane = pick && pick.lane;
        const wait = lane && lane.wait;
        const main = wait && (isActiveWait(wait) || wait.pending)
          ? waitCellHtml(wait)
          : `<span class="wait-empty">—</span>`;
        return {
          html: main,
          openLine: specialPoolOpenText(port, "ready"),
          cls: wait && isActiveWait(wait) ? "has-" + wait.cls : (wait && wait.pending ? "has-pending" : "")
        };
      }

      // Veterans: SENTRI wait; open line mirrors Vehicles (SENTRI is part of the vehicle pool).
      if (veteransOnlySentri) {
        const lane = pick && pick.lane;
        const wait = lane && lane.wait;
        const main = wait && isActiveWait(wait)
          ? waitCellHtml(wait)
          : wait && wait.pending
            ? waitCellHtml(wait)
            : `<span class="wait-empty">—</span>`;
        return {
          html: main,
          openLine: specialPoolOpenText(port, "sentri"),
          cls: wait && isActiveWait(wait) ? "has-" + wait.cls : (wait && wait.pending ? "has-pending" : "")
        };
      }

      // Commercial filter: FAST column — never SENTRI
      if (commercialOnly) {
        return commercialFilterChip(port, "fast");
      }

      if (!pick) {
        return { html: `<span class="wait-empty">—</span>`, cls: "" };
      }

      let openLine = /sentri/i.test(pick.lane.name)
        ? specialPoolOpenText(port, "sentri")
        : /fast/i.test(pick.lane.name)
          ? specialPoolOpenText(port, "fast")
          : sectionOfLine(sectionByKey(port, pick.sectionKey));
      return {
        html: waitCellHtml(pick.lane.wait),
        openLine: openLine,
        cls: "has-" + pick.lane.wait.cls
      };
    }

    function cellHasPublishedWait(cell) {
      const html = cell && cell.html ? cell.html : "";
      const cls = (cell && cell.cls) || "";
      return /class="num">\d+/.test(html) ||
        /has-pending/.test(cls) ||
        /pending/i.test(cls) ||
        /updatePending|Update Pending|update\s*pending/i.test(html);
    }

    /** Any cell without a real minute value (or pending) → N/A chip — every filter */
    function toEmptyNaChip(cell) {
      if (cell && cell.keep) {
        const html = cell.html && String(cell.html).includes("wait-stack")
          ? cell.html
          : `<div class="wait-stack">${(cell && cell.html) || ""}</div>`;
        return {
          html: html,
          openLine: (cell && cell.openLine) || "",
          cls: cell.cls || ""
        };
      }
      const html = cell && cell.html ? cell.html : "";
      const cls = (cell && cell.cls) || "";
      if (cellHasPublishedWait(cell)) {
        return {
          html: html.includes("wait-stack") ? html : `<div class="wait-stack">${html}</div>`,
          openLine: (cell && cell.openLine) || "",
          cls: cls || "has-low"
        };
      }
      return {
        html:
          `<div class="wait-stack wait-stack-na">` +
          `<span class="wait-na">${escapeHtml(t("na"))}</span>` +
          `</div>`,
        openLine: "",
        cls: "has-na"
      };
    }

    function openLineMarkup(text) {
      if (text) {
        return String(text).split("\n").filter(Boolean).map(function (line) {
          return `<span class="wait-extra open-line">${escapeHtml(line)}</span>`;
        }).join("");
      }
      return `<span class="wait-extra open-line open-line-empty" aria-hidden="true">&nbsp;</span>`;
    }

    function waitStackWithOpen(cell) {
      let stack = cell.html && cell.html.includes("wait-stack")
        ? cell.html
        : `<div class="wait-stack">${cell.html || ""}</div>`;
      return stack.replace(/<\/div>\s*$/, openLineMarkup(cell.openLine) + "</div>");
    }

    function noticeBannerHtml(port) {
      if (!port || !port.notice) return "";
      return (
        `<div class="notice">` +
        `<div class="notice-label">${escapeHtml(t("borderNotice"))}</div>` +
        escapeHtml(translateNotice(port.notice)) +
        `</div>`
      );
    }

    function showMexicoNames() {
      return currentLang === "es";
    }

    function syncMexicoNameVisibility() {
      const show = showMexicoNames();
      document.querySelectorAll(".mx-line, .m-row-mx, .nearby-chip-mx").forEach(function (el) {
        el.hidden = !show;
      });
    }

    function mexicoLineHtml(port, className) {
      if (!showMexicoNames()) return "";
      const mx = port && port.meta && port.meta.mx;
      if (!mx) return "";
      return `<span class="${className}">${escapeHtml(t("mexicoLabel"))} ${escapeHtml(mx)}</span>`;
    }

    function mapsHref(port) {
      const q = port && port.meta && port.meta.mapsQuery;
      if (!q) return "";
      // iPhone / iPad → Apple Maps; everyone else → Google Maps
      if (isAppleMobileUa()) {
        return "https://maps.apple.com/?q=" + encodeURIComponent(q);
      }
      return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    }

    function formatDistanceLabel(miles) {
      if (miles == null || !isFinite(miles)) return "";
      if (currentLang === "es") {
        const km = Math.round(miles * 1.60934 * 10) / 10;
        return t("distKm").replace("{n}", km.toFixed(1));
      }
      const mi = Math.round(miles * 10) / 10;
      return t("distMi").replace("{n}", mi.toFixed(1));
    }

    function portDistanceMiles(port) {
      if (!userGeo || userGeo === "denied") return null;
      const meta = port && port.meta;
      if (!meta || meta.lat == null || meta.lng == null) return null;
      return haversineMiles(userGeo, { lat: meta.lat, lng: meta.lng });
    }

    function mapsLinkHtml(port) {
      const href = mapsHref(port);
      if (!href) return "";
      const name = (port && port.meta && port.meta.short) || "bridge";
      const label = t("openMaps").replace("{name}", name);
      const dist = formatDistanceLabel(portDistanceMiles(port));
      const distHtml = dist
        ? `<span class="bridge-dist">${escapeHtml(dist)}</span>`
        : "";
      return (
        `<span class="bridge-map-wrap">` +
        `<a class="bridge-map" href="${escapeHtml(href)}" target="_blank" rel="noopener" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">` +
        `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
        `<path d="M12 21s-6.5-5.8-6.5-10.2a6.5 6.5 0 1 1 13 0C18.5 15.2 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>` +
        `<circle cx="12" cy="10.6" r="2.2" fill="currentColor"/>` +
        `</svg></a>${distHtml}</span>`
      );
    }

    function bridgeTitleHtml(port, extraClass) {
      const name = (port && port.meta && port.meta.short) || "";
      const cls = extraClass ? "bridge-title " + extraClass : "bridge-title";
      return `<span class="${cls}"><span class="bridge-name">${escapeHtml(name)}</span>${mapsLinkHtml(port) || ""}</span>`;
    }

    const CROWD_OPEN_KEY = "bwt-crowd-open";
    const CROWD_SENTRI_KEY = "bwt-crowd-sentri";
    const CROWD_LAST_KEY = "bwt-crowd-last";
    const SENTRI_VERIFY_MS = 90 * 24 * 60 * 60 * 1000;
    const CROWD_BRIDGES = [
      { id: "bm", short: "B&M" },
      { id: "gateway", short: "Gateway" },
      { id: "veterans", short: "Veterans" },
      { id: "los-indios", short: "Los Indios" }
    ];
    // U.S. booth anchors. Keep in sync with worker/src/northbound.js.
    const NORTHBOUND_ANCHORS = {
      bm: { lat: 25.89329, lng: -97.505497 },
      gateway: { lat: 25.899143, lng: -97.496978 },
      veterans: { lat: 25.889361, lng: -97.476139 },
      "los-indios": { lat: 26.029167, lng: -97.73875 }
    };
    const NORTHBOUND_MAX_MI = 3;
    const NORTHBOUND_AT_BOOTH_MI = 0.15;
    const NORTHBOUND_MAX_BEARING = 70;
    const NORTHBOUND_HEADING_AWAY = 120;
    const NORTHBOUND_MAX_ACC_M = 400;
    /** Ignore a nearer booth when the next one is this close. About 80 meters. */
    const NORTHBOUND_GAP_MI = 0.05;
    const CROWD_MINS = [0, 5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];
    let crowdPollTimer = null;
    let crowdGeo = null;
    let crowdMode = "";
    let crowdBridge = "";
    let crowdBridgeManual = false;
    let crowdApplying = false;
    let crowdLane = "";
    let crowdWait = null;
    let crowdWhere = "";
    let crowdPinMode = "";
    let crowdSummary = null;

    function crowdReadSentri() {
      try {
        const raw = localStorage.getItem(CROWD_SENTRI_KEY);
        if (!raw) return { on: false, verifiedAt: 0 };
        const o = JSON.parse(raw);
        return { on: !!o.on, verifiedAt: Number(o.verifiedAt) || 0 };
      } catch (_) {
        return { on: false, verifiedAt: 0 };
      }
    }
    function crowdWriteSentri(on, verifiedAt) {
      try {
        localStorage.setItem(CROWD_SENTRI_KEY, JSON.stringify({
          on: !!on,
          verifiedAt: verifiedAt || (on ? Date.now() : 0)
        }));
      } catch (_) { /* ignore */ }
    }
    function crowdSentriActive() {
      const s = crowdReadSentri();
      return s.on && s.verifiedAt && (Date.now() - s.verifiedAt) < SENTRI_VERIFY_MS;
    }
    function crowdSentriNeedsVerify() {
      const s = crowdReadSentri();
      return s.on && (!s.verifiedAt || (Date.now() - s.verifiedAt) >= SENTRI_VERIFY_MS);
    }
    function crowdPortId(port) {
      if (isVeteransPort(port)) return "veterans";
      if (isGatewayPort(port)) return "gateway";
      if (isLosIndiosPort(port)) return "los-indios";
      return "bm";
    }
    function crowdLanesFor() {
      if (!crowdMode || !crowdBridge) return [];
      if (crowdMode === "ped") {
        if (crowdBridge === "los-indios") return [];
        if (crowdBridge === "gateway") return ["ped_gen", "ped_ready"];
        return ["ped_gen"];
      }
      const lanes = ["vehicle_gen"];
      if (crowdBridge === "veterans" && crowdSentriActive()) lanes.push("vehicle_sentri");
      return lanes;
    }
    function crowdWaitPhrase(n) {
      n = Number(n) || 0;
      if (n <= 90) return n + " min";
      const h = Math.floor(n / 60);
      const m = n % 60;
      if (m === 0) return t("crowdWaitHr").replace("{h}", String(h));
      return t("crowdWaitHrMin").replace("{h}", String(h)).replace("{m}", String(m));
    }
    function crowdWaitChipLabel(n) {
      n = Number(n) || 0;
      if (n <= 90) return String(n);
      return crowdWaitPhrase(n);
    }
    function crowdLaneLabel(lane) {
      if (lane === "vehicle_sentri" || lane === "ped_ready") {
        return lane === "vehicle_sentri" ? t("sentri") : t("ready");
      }
      return t("gen");
    }
    function crowdBridgeLabel(id) {
      const row = CROWD_BRIDGES.filter(function (b) { return b.id === id; })[0];
      return row ? row.short : id;
    }
    function crowdGeoNow() {
      if (crowdGeo && crowdGeo.lat != null) return crowdGeo;
      if (userGeo && userGeo !== "denied" && userGeo.lat != null) return userGeo;
      return null;
    }
    function crowdAnchorWithin(geo, maxMiles) {
      let i;
      for (i = 0; i < CROWD_BRIDGES.length; i++) {
        const anchor = NORTHBOUND_ANCHORS[CROWD_BRIDGES[i].id];
        if (anchor && haversineMiles(geo, anchor) <= maxMiles) return true;
      }
      return false;
    }
    /** Same rule as nearestNorthboundBridge in worker/src/northbound.js. */
    function crowdPickBridge(geo) {
      if (!geo || geo.lat == null || geo.lng == null) return null;
      if (!isFinite(Number(geo.lat)) || !isFinite(Number(geo.lng))) return null;
      const hits = [];
      CROWD_BRIDGES.forEach(function (b) {
        if (!crowdNorthbound(b.id, geo)) return;
        const anchor = NORTHBOUND_ANCHORS[b.id];
        hits.push({ id: b.id, short: b.short, miles: haversineMiles(geo, anchor) });
      });
      hits.sort(function (a, b) { return a.miles - b.miles; });
      if (!hits.length) return null;
      if (hits.length > 1) {
        const gap = hits[1].miles - hits[0].miles;
        const acc = geo.acc == null || geo.acc === "" ? 0 : Number(geo.acc);
        const accMi = isFinite(acc) && acc > 0 ? acc / 1609.344 : 0;
        if (gap < Math.max(accMi, NORTHBOUND_GAP_MI)) {
          return {
            id: "",
            ambiguous: true,
            miles: hits[0].miles,
            short: "",
            names: [hits[0].short, hits[1].short]
          };
        }
      }
      return { id: hits[0].id, ambiguous: false, miles: hits[0].miles, short: hits[0].short, names: [] };
    }
    function crowdAmbiguousText(pick) {
      const a = pick && pick.names && pick.names[0] ? pick.names[0] : "B&M";
      const b = pick && pick.names && pick.names[1] ? pick.names[1] : "Gateway";
      return t("crowdBridgeAmbiguous").replace("{a}", a).replace("{b}", b);
    }
    function crowdApplyPick(geo) {
      if (!geo || geo.lat == null || geo.lng == null) return { pick: null, changed: false };
      const pick = crowdPickBridge(geo);
      if (crowdBridgeManual && crowdNorthbound(crowdBridge, geo)) {
        return { pick: pick, changed: false };
      }
      const next = pick && pick.id && !pick.ambiguous ? pick.id : "";
      if (next === crowdBridge) return { pick: pick, changed: false };
      crowdBridge = next;
      crowdBridgeManual = false;
      crowdEnsureLane();
      return { pick: pick, changed: true };
    }
    function crowdBearingDegrees(from, to) {
      const toRad = function (d) { return (d * Math.PI) / 180; };
      const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
      const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
        Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
      return (Math.atan2(y, x) * 180) / Math.PI;
    }
    function crowdAngleDelta(a, b) {
      const norm = function (deg) { return ((Number(deg) % 360) + 360) % 360; };
      const d = Math.abs(norm(a) - norm(b));
      return d > 180 ? 360 - d : d;
    }
    function crowdNorthbound(bridgeId, geo) {
      const anchor = NORTHBOUND_ANCHORS[bridgeId];
      if (!anchor || !geo || geo.lat == null || geo.lng == null) return false;
      const acc = geo.acc == null ? null : Number(geo.acc);
      if (acc != null && isFinite(acc) && acc > NORTHBOUND_MAX_ACC_M) return false;
      const miles = haversineMiles(geo, anchor);
      if (miles > NORTHBOUND_MAX_MI) return false;
      if (miles <= NORTHBOUND_AT_BOOTH_MI) return true;
      const toAnchor = crowdBearingDegrees(geo, anchor);
      if (crowdAngleDelta(toAnchor, 0) > NORTHBOUND_MAX_BEARING) return false;
      if (geo.heading != null && geo.heading !== "" && isFinite(Number(geo.heading))) {
        if (crowdAngleDelta(geo.heading, toAnchor) > NORTHBOUND_HEADING_AWAY) return false;
      }
      return true;
    }
    function crowdCbpMin(bridge, lane) {
      if (!lastData || !lastData.items) return null;
      const port = lastData.items.filter(function (p) { return crowdPortId(p) === bridge; })[0];
      if (!port) return null;
      if (lane === "vehicle_sentri") {
        const w = laneWaitForShare(port, "sentri");
        return w && isActiveWait(w) ? w.minutes : null;
      }
      if (lane.indexOf("ped_") === 0) {
        const sum = summarizeMode(port.sections, "pedestrian");
        if (lane === "ped_ready") {
          const extra = (sum && sum.extras || []).filter(function (l) { return /ready/i.test(l.name); })[0];
          return extra && extra.wait && extra.wait.minutes != null ? extra.wait.minutes : null;
        }
        return sum && sum.primary && sum.primary.minutes != null ? sum.primary.minutes : null;
      }
      return passengerVehicleWait(port);
    }
    function crowdChipRow(id, items, selected, attr) {
      return items.map(function (item) {
        const val = item.id || item;
        const lab = item.label || item;
        return `<button type="button" class="crowd-chip${val === selected ? " on" : ""}" data-crowd="${attr}" data-val="${escapeHtml(String(val))}">${escapeHtml(lab)}</button>`;
      }).join("");
    }
    function crowdStopPoll() {
      if (crowdPollTimer) {
        clearInterval(crowdPollTimer);
        crowdPollTimer = null;
      }
    }
    function refreshGeoIfGranted(options) {
      const bwt = window.BwtGeo;
      if (!bwt || !navigator.geolocation) return Promise.resolve(currentGeoFix());
      return bwt.queryPermission().then(function (perm) {
        if (perm !== "granted") return currentGeoFix();
        return new Promise(function (resolve) {
          navigator.geolocation.getCurrentPosition(function (pos) {
            const fix = bwt.fixFromPosition(pos);
            if (fix && geoStore) {
              geoStore.writeChoice("granted");
              geoStore.writeCache(fix);
              publishGeoFix(fix, true);
            }
            resolve(currentGeoFix());
          }, function () { resolve(currentGeoFix()); }, options);
        });
      });
    }
    function crowdAskGeo(highAcc) {
      refreshGeoIfGranted({
        enableHighAccuracy: !!highAcc,
        timeout: highAcc ? 12000 : 8000,
        maximumAge: highAcc ? 0 : 30000
      }).then(function () { crowdRefreshNear(); });
    }
    function crowdStartPoll() {
      crowdStopPoll();
      const geo = crowdGeo || (userGeo && userGeo !== "denied" ? userGeo : null);
      if (geo) {
        crowdGeo = crowdGeo || {
          lat: geo.lat,
          lng: geo.lng,
          acc: geo.acc == null ? null : geo.acc,
          heading: geo.heading == null ? null : geo.heading
        };
        crowdRefreshNear();
      }
      crowdAskGeo(false);
      crowdPollTimer = setInterval(function () {
        if (document.hidden) return;
        const box = document.getElementById("crowdSource");
        if (!box || !box.open) return;
        crowdAskGeo(false);
      }, 90000);
    }
    function crowdRefreshNear() {
      const geo = crowdGeoNow();
      const applied = crowdApplying
        ? { pick: crowdPickBridge(geo), changed: false }
        : crowdApplyPick(geo);
      if (applied.changed && crowdMode) {
        crowdApplying = true;
        try { crowdRerenderForm(); }
        finally { crowdApplying = false; }
        return;
      }
      if (applied.changed) {
        document.querySelectorAll('#crowdSource [data-crowd="bridge"]').forEach(function (btn) {
          btn.classList.toggle("on", btn.getAttribute("data-val") === crowdBridge);
        });
      }
      const pick = applied.pick;
      const dot = document.getElementById("crowdNearDot");
      const line = document.getElementById("crowdNearLine");
      let text = "";
      let showDot = false;
      const manualOk = !!(geo && crowdBridgeManual && crowdNorthbound(crowdBridge, geo));
      if (pick && pick.ambiguous && !manualOk) {
        text = crowdAmbiguousText(pick);
      } else if (pick && pick.id && !crowdBridgeManual && crowdBridge === pick.id) {
        text = t("crowdBridgeAuto");
        showDot = pick.miles <= 1.5;
      } else if (manualOk) {
        const miles = haversineMiles(geo, NORTHBOUND_ANCHORS[crowdBridge]);
        if (miles <= 1.5) {
          text = t("crowdNear").replace("{bridge}", crowdBridgeLabel(crowdBridge));
          showDot = true;
        }
      } else if (geo && !crowdBridge && crowdAnchorWithin(geo, NORTHBOUND_MAX_MI)) {
        text = t("crowdNeedNorth");
      }
      if (dot) {
        dot.hidden = !showDot;
        if (showDot) {
          const nearName = (pick && pick.short) || crowdBridgeLabel(crowdBridge);
          dot.setAttribute("title", t("crowdNear").replace("{bridge}", nearName));
        }
      }
      if (line) line.textContent = text;
    }
    function crowdEnsureLane() {
      const lanes = crowdLanesFor();
      if (crowdLane && lanes.indexOf(crowdLane) < 0) crowdLane = "";
    }
    function crowdReadyToSend() {
      if (!crowdMode || !crowdBridge || crowdWait == null) return false;
      const lanes = crowdLanesFor();
      if (!lanes.length) return false;
      if (lanes.length > 1 && !crowdLane) return false;
      return true;
    }
    function crowdPinModePicked() {
      return crowdPinMode === "vehicle" || crowdPinMode === "ped";
    }
    function crowdPinLaneFor(bridge) {
      if (crowdPinMode === "ped") {
        if (bridge === "los-indios") return "vehicle_gen";
        return "ped_gen";
      }
      return "vehicle_gen";
    }
    function crowdLaneOrDefault() {
      const lanes = crowdLanesFor();
      if (crowdLane && lanes.indexOf(crowdLane) >= 0) return crowdLane;
      if (lanes.length === 1) return lanes[0];
      return "";
    }
    function crowdFormHtml() {
      crowdEnsureLane();
      const sentri = crowdReadSentri();
      const needs = crowdSentriNeedsVerify();
      let sentriHtml = "";
      if (needs) {
        sentriHtml = `<div class="crowd-sentri-row" id="crowdSentriRow">
          <span>${escapeHtml(t("crowdStillSentri"))}</span>
          <button type="button" data-crowd="sentri-yes">${escapeHtml(t("crowdYes"))}</button>
          <button type="button" class="ghost" data-crowd="sentri-no">${escapeHtml(t("crowdNo"))}</button>
        </div>`;
      } else {
        sentriHtml = `<label class="crowd-sentri-row">
          <input type="checkbox" id="crowdSentriOn" ${sentri.on ? "checked" : ""} />
          ${escapeHtml(t("crowdHaveSentri"))}
        </label>`;
      }
      const lanes = crowdLanesFor();
      const laneRow = lanes.length > 1
        ? `<span class="crowd-label">${escapeHtml(t("crowdLane"))}</span>
           <div class="crowd-chips">${crowdChipRow("lane", lanes.map(function (l) { return { id: l, label: crowdLaneLabel(l) }; }), crowdLane, "lane")}</div>`
        : "";
      const pedBlocked = crowdMode === "ped" && crowdBridge === "los-indios";
      let waitHtml;
      if (pedBlocked) {
        waitHtml = `<p class="crowd-status">${escapeHtml(t("crowdNoPed"))}</p>`;
      } else {
        waitHtml = laneRow + `
        <div class="crowd-block">
          <span class="crowd-label">${escapeHtml(t("crowdWaitBlock"))}</span>
          <span class="crowd-label">${escapeHtml(t("crowdMinutes"))}</span>
          <div class="crowd-chips">
            ${crowdChipRow("wait", CROWD_MINS.map(function (n) { return { id: String(n), label: crowdWaitChipLabel(n) }; }), crowdWait == null ? "" : String(crowdWait), "wait")}
          </div>
          <button type="button" class="crowd-submit" id="crowdSubmitWait"${crowdReadyToSend() ? "" : " disabled"}>${escapeHtml(t("crowdReportWait"))}</button>
          <p class="crowd-status" id="crowdMsg"></p>
        </div>
        <div class="crowd-avgs" id="crowdAvgs"></div>`;
      }
      const pinHtml = `
        <div class="crowd-block">
          <span class="crowd-label">${escapeHtml(t("crowdPinBlock"))}</span>
          <p class="crowd-status">${escapeHtml(t("crowdPinHint"))}</p>
          <span class="crowd-label">${escapeHtml(t("crowdMode"))}</span>
          <div class="crowd-chips">
            ${crowdChipRow("pin-mode", [{ id: "vehicle", label: t("crowdVehicles") }, { id: "ped", label: t("crowdWalking") }], crowdPinMode, "pin-mode")}
          </div>
          <button type="button" class="crowd-submit" id="crowdSubmitPin"${crowdPinModePicked() ? "" : " disabled"}>${escapeHtml(t("crowdCheckIn"))}</button>
          <p class="crowd-status" id="crowdPinMsg"></p>
          <p class="crowd-status" id="crowdLastPin"></p>
          <div class="crowd-map" id="crowdMapEl"></div>
        </div>`;
      return `
        <p class="crowd-privacy">${escapeHtml(t("crowdPrivacy"))}</p>
        ${sentriHtml}
        <span class="crowd-label">${escapeHtml(t("crowdWaitBlock"))}</span>
        <span class="crowd-label">${escapeHtml(t("crowdMode"))}</span>
        <div class="crowd-chips">
          ${crowdChipRow("mode", [{ id: "vehicle", label: t("crowdVehicles") }, { id: "ped", label: t("crowdWalking") }], crowdMode, "mode")}
        </div>
        <span class="crowd-label">${escapeHtml(t("crowdBridge"))}</span>
        <div class="crowd-chips">
          ${crowdChipRow("bridge", CROWD_BRIDGES.map(function (b) { return { id: b.id, label: b.short }; }), crowdBridge, "bridge")}
        </div>
        <p class="crowd-near-line" id="crowdNearLine"></p>
        ${waitHtml}
        ${pinHtml}`;
    }
    function crowdPaintAvgs() {
      const el = document.getElementById("crowdAvgs");
      if (!el) return;
      const rows = (crowdSummary && crowdSummary.rows) || [];
      const showSentri = crowdSentriActive();
      const byBridge = {};
      rows.forEach(function (r) {
        if (r.n < 3) return;
        if (r.lane === "vehicle_sentri" && !showSentri) return;
        if (r.lane === "vehicle_ready") return;
        if (!byBridge[r.bridge]) byBridge[r.bridge] = [];
        byBridge[r.bridge].push(r);
      });
      const ids = Object.keys(byBridge);
      if (!ids.length) {
        el.innerHTML = "";
        return;
      }
      el.innerHTML = `<div class="crowd-label">${escapeHtml(t("crowdAvgs"))}</div>` + ids.map(function (id) {
        const lines = byBridge[id].map(function (r) {
          const agoMin = Math.max(1, Math.round((Date.now() - r.latest) / 60000));
          return `<div class="crowd-avg-line">${escapeHtml(t("crowdAvgLine")
            .replace("{lane}", crowdLaneLabel(r.lane))
            .replace("{wait}", crowdWaitPhrase(r.median))
            .replace("{n}", String(r.n))
            .replace("{ago}", t("crowdAgo").replace("{n}", String(agoMin))))}</div>`;
        }).join("");
        return `<div class="crowd-avg-bridge">${escapeHtml(crowdBridgeLabel(id))}</div>${lines}`;
      }).join("");
    }
    function crowdLoadSummary() {
      const base = (FEED_PROXY_URL && String(FEED_PROXY_URL).trim())
        ? String(FEED_PROXY_URL).replace(/\/$/, "")
        : "";
      if (!base) return;
      fetch(base + "/checkins/summary")
        .then(function (res) { return res.json(); })
        .then(function (j) {
          crowdSummary = j;
          crowdPaintAvgs();
        })
        .catch(function () { /* keep empty */ });
    }
    function crowdBind() {
      const box = document.getElementById("crowdSource");
      if (!box) return;
      box.addEventListener("toggle", function () {
        try { localStorage.setItem(CROWD_OPEN_KEY, box.open ? "1" : "0"); } catch (_) { /* ignore */ }
        syncCrowdAria(box);
        if (box.open) {
          crowdStartPoll();
          crowdLoadSummary();
          crowdLoadHeat();
        } else {
          crowdStopPoll();
        }
      });
      box.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-crowd]");
        if (!btn || !box.contains(btn)) return;
        const kind = btn.getAttribute("data-crowd");
        const val = btn.getAttribute("data-val");
        if (kind === "mode") {
          crowdMode = val;
          crowdEnsureLane();
          crowdRerenderForm();
        } else if (kind === "bridge") {
          crowdBridge = val;
          crowdBridgeManual = true;
          crowdEnsureLane();
          crowdRerenderForm();
        } else if (kind === "lane") {
          crowdLane = val;
          crowdRerenderForm();
        } else if (kind === "wait") {
          crowdWait = parseInt(val, 10);
          crowdRerenderForm();
        } else if (kind === "pin-mode") {
          crowdPinMode = val;
          crowdRerenderForm();
        } else if (kind === "sentri-yes") {
          crowdWriteSentri(true, Date.now());
          crowdRerenderForm();
        } else if (kind === "sentri-no") {
          crowdWriteSentri(false, 0);
          crowdRerenderForm();
        }
      });
      const sentriOn = document.getElementById("crowdSentriOn");
      if (sentriOn) {
        sentriOn.addEventListener("change", function () {
          crowdWriteSentri(sentriOn.checked, sentriOn.checked ? Date.now() : 0);
          crowdRerenderForm();
        });
      }
      const submit = document.getElementById("crowdSubmitWait");
      if (submit) submit.addEventListener("click", crowdSubmitWait);
      const pin = document.getElementById("crowdSubmitPin");
      if (pin) pin.addEventListener("click", crowdSubmitPin);
      const collapseBtn = box.querySelector(".crowd-collapse");
      if (collapseBtn) {
        collapseBtn.addEventListener("click", function (event) {
          event.preventDefault();
          box.open = false;
          syncCrowdAria(box);
        });
      }
      syncCrowdAria(box);
      crowdRefreshNear();
      crowdPaintAvgs();
      crowdLoadHeat();
    }
    function crowdRerenderForm() {
      const box = document.getElementById("crowdSource");
      if (!box) return;
      const wasOpen = box.open;
      crowdDropMap();
      const title = box.querySelector(".crowd-title");
      const sub = box.querySelector(".crowd-sub");
      if (title) title.textContent = t("crowdTitle");
      if (sub) sub.textContent = t("crowdSub");
      const body = box.querySelector(".crowd-body");
      if (body) body.innerHTML = crowdFormHtml();
      box.open = wasOpen;
      crowdBindInner();
      crowdRefreshNear();
      crowdPaintAvgs();
    }
    function crowdBindInner() {
      const box = document.getElementById("crowdSource");
      if (!box) return;
      const sentriOn = document.getElementById("crowdSentriOn");
      if (sentriOn) {
        sentriOn.onchange = function () {
          crowdWriteSentri(sentriOn.checked, sentriOn.checked ? Date.now() : 0);
          crowdRerenderForm();
        };
      }
      const submit = document.getElementById("crowdSubmitWait");
      if (submit) submit.onclick = crowdSubmitWait;
      const pin = document.getElementById("crowdSubmitPin");
      if (pin) pin.onclick = crowdSubmitPin;
      crowdLoadHeat();
    }
    function crowdSubmit() {
      crowdSubmitWait();
    }
    function crowdProxyBase() {
      return (FEED_PROXY_URL && String(FEED_PROXY_URL).trim())
        ? String(FEED_PROXY_URL).replace(/\/$/, "")
        : "";
    }
    function crowdSubmitWait() {
      const msg = document.getElementById("crowdMsg");
      const submit = document.getElementById("crowdSubmitWait");
      crowdEnsureLane();
      const lane = crowdLaneOrDefault();
      if (!crowdReadyToSend() || !lane) {
        if (msg) msg.textContent = t("crowdNeedPicks");
        return;
      }
      const base = crowdProxyBase();
      if (!base) {
        if (msg) msg.textContent = t("crowdErr");
        return;
      }
      if (submit) submit.disabled = true;
      requestUserGeo(true, { preserveMap: true }).then(function (fix) {
        const geo = (fix && fix.lat != null) ? fix : crowdGeoNow();
        const applied = crowdApplyPick(geo);
        if (applied.changed) crowdRerenderForm();
        const msgNow = document.getElementById("crowdMsg");
        const submitNow = document.getElementById("crowdSubmitWait");
        const laneNow = crowdLaneOrDefault();
        if (!crowdBridge) {
          if (submitNow) submitNow.disabled = false;
          if (msgNow) {
            msgNow.textContent = applied.pick && applied.pick.ambiguous
              ? crowdAmbiguousText(applied.pick)
              : t("crowdNeedNorth");
          }
          return;
        }
        if (!crowdReadyToSend() || !laneNow) {
          if (submitNow) submitNow.disabled = false;
          if (msgNow) msgNow.textContent = t("crowdNeedPicks");
          return;
        }
        if (!crowdNorthbound(crowdBridge, geo)) {
          if (submitNow) submitNow.disabled = false;
          if (msgNow) msgNow.textContent = t("crowdNeedNorth");
          return;
        }
        try {
          const last = JSON.parse(localStorage.getItem(CROWD_LAST_KEY) || "{}");
          if (last.kind === "wait" && last.bridge === crowdBridge && last.lane === laneNow && Date.now() - (last.t || 0) < 10 * 60 * 1000) {
            if (submitNow) submitNow.disabled = false;
            if (msgNow) msgNow.textContent = t("crowdBusy");
            return;
          }
        } catch (_) { /* ignore */ }
        if (submitNow) submitNow.disabled = true;
        const sentBridge = crowdBridge;
        const sentLane = laneNow;
        const payload = {
          kind: "wait",
          bridge: sentBridge,
          lane: sentLane,
          wait_min: crowdWait,
          lat: geo.lat,
          lng: geo.lng,
          acc_m: geo.acc,
          heading: geo.heading,
          cbp_min: crowdCbpMin(sentBridge, sentLane)
        };
        fetch(base + "/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) { return res.json().then(function (j) { return { res: res, j: j }; }); })
        .then(function (pack) {
          if (submitNow) submitNow.disabled = false;
          if (!pack.j || !pack.j.ok) {
            if (msgNow) {
              msgNow.textContent = pack.res && pack.res.status === 429
                ? t("crowdBusy")
                : (pack.j && pack.j.error === "Northbound only" ? t("crowdNeedNorth") : t("crowdErr"));
            }
            return;
          }
          try {
            localStorage.setItem(CROWD_LAST_KEY, JSON.stringify({
              kind: "wait", bridge: sentBridge, lane: sentLane, t: Date.now()
            }));
          } catch (_) { /* ignore */ }
          if (msgNow) {
            msgNow.textContent = t("crowdThanks")
              .replace("{wait}", crowdWaitPhrase(crowdWait))
              .replace("{bridge}", crowdBridgeLabel(sentBridge))
              .replace("{lane}", crowdLaneLabel(sentLane));
          }
          crowdLoadSummary();
        })
        .catch(function () {
          if (submitNow) submitNow.disabled = false;
          if (msgNow) msgNow.textContent = t("crowdErr");
        });
      });
    }
    function crowdSubmitPin() {
      const msg = document.getElementById("crowdPinMsg");
      const submit = document.getElementById("crowdSubmitPin");
      if (!crowdPinModePicked()) {
        if (msg) msg.textContent = t("crowdNeedPin");
        return;
      }
      const base = crowdProxyBase();
      if (!base) {
        if (msg) msg.textContent = t("crowdErr");
        return;
      }
      if (submit) submit.disabled = true;
      function sendPin(geo) {
        if (!geo || geo.lat == null) {
          if (submit) submit.disabled = false;
          if (msg) msg.textContent = t("crowdNeedLoc");
          return;
        }
        const applied = crowdApplyPick(geo);
        if (applied.changed) crowdRerenderForm();
        const pinMsg = document.getElementById("crowdPinMsg");
        const pinBtn = document.getElementById("crowdSubmitPin");
        const pick = applied.pick || crowdPickBridge(geo);
        let bridgeId = "";
        if (pick && pick.id && !pick.ambiguous) bridgeId = pick.id;
        else if (pick && pick.ambiguous && crowdNorthbound(crowdBridge, geo)) bridgeId = crowdBridge;
        if (!bridgeId) {
          if (pinBtn) pinBtn.disabled = false;
          if (pinMsg) {
            pinMsg.textContent = pick && pick.ambiguous
              ? crowdAmbiguousText(pick)
              : (crowdAnchorWithin(geo, NORTHBOUND_MAX_MI) ? t("crowdNeedNorth") : t("crowdPinFar"));
          }
          return;
        }
        const lane = crowdPinLaneFor(bridgeId);
        try {
          const last = JSON.parse(localStorage.getItem(CROWD_LAST_KEY) || "{}");
          if (last.kind === "pin" && last.bridge === bridgeId && last.lane === lane && Date.now() - (last.t || 0) < 10 * 60 * 1000) {
            if (pinBtn) pinBtn.disabled = false;
            if (pinMsg) pinMsg.textContent = t("crowdBusy");
            return;
          }
        } catch (_) { /* ignore */ }
        fetch(base + "/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            kind: "pin",
            bridge: bridgeId,
            lane: lane,
            lat: geo.lat,
            lng: geo.lng,
            acc_m: geo.acc,
            heading: geo.heading
          })
        }).then(function (res) { return res.json().then(function (j) { return { res: res, j: j }; }); })
          .then(function (pack) {
            if (pinBtn) pinBtn.disabled = false;
            if (!pack.j || !pack.j.ok) {
              if (pinMsg) {
                pinMsg.textContent = pack.res && pack.res.status === 429
                  ? t("crowdBusy")
                  : (pack.j && pack.j.error === "Northbound only" ? t("crowdNeedNorth") : t("crowdErr"));
              }
              return;
            }
            try {
              localStorage.setItem(CROWD_LAST_KEY, JSON.stringify({
                kind: "pin", bridge: bridgeId, lane: lane, t: Date.now()
              }));
            } catch (_) { /* ignore */ }
            if (pinMsg) pinMsg.textContent = t("crowdThanksPin").replace("{bridge}", crowdBridgeLabel(bridgeId));
            crowdLoadHeat();
          })
          .catch(function () {
            if (pinBtn) pinBtn.disabled = false;
            if (pinMsg) pinMsg.textContent = t("crowdErr");
          });
      }
      refreshGeoIfGranted({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }).then(function (fix) {
        sendPin(fix || (userGeo && userGeo !== "denied" ? userGeo : null));
      });
    }
    let crowdMap = null;
    let crowdHeatLayer = null;
    let crowdYouMarker = null;
    let crowdMapPoints = [];
    function crowdDropMap() {
      if (crowdMap) {
        try { crowdMap.remove(); } catch (_) { /* ignore */ }
        crowdMap = null;
        crowdHeatLayer = null;
        crowdYouMarker = null;
      }
    }
    function crowdMarkHere(lat, lng) {
      if (!crowdMap || lat == null || lng == null) return;
      crowdMap.setView([lat, lng], 15);
      if (crowdYouMarker) {
        try { crowdMap.removeLayer(crowdYouMarker); } catch (_) { /* ignore */ }
      }
      crowdYouMarker = L.circleMarker([lat, lng], {
        radius: 9,
        color: "#1d4ed8",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.95
      }).addTo(crowdMap);
      crowdYouMarker.bindPopup(t("crowdCenterOn"));
    }
    function crowdFallbackMapCenter() {
      if (!crowdMap || !crowdMapPoints.length) return;
      const last = crowdMapPoints.slice().sort(function (a, b) { return (b.t || 0) - (a.t || 0); })[0];
      crowdMap.setView([last.lat, last.lng], 14);
    }
    function crowdCenterOnMe() {
      if (!crowdMap) return;
      const known = currentGeoFix();
      if (known) {
        crowdMarkHere(known.lat, known.lng);
        refreshGeoIfGranted({ enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }).then(function (fix) {
          if (fix && crowdMap) crowdMarkHere(fix.lat, fix.lng);
        });
        return;
      }
      requestUserGeo(true, { preserveMap: true }).then(function (fix) {
        if (!crowdMap) return;
        if (fix && fix.lat != null) crowdMarkHere(fix.lat, fix.lng);
        else crowdFallbackMapCenter();
      });
    }
    function crowdAddCenterControl() {
      if (!crowdMap || !window.L) return;
      const Ctrl = L.Control.extend({
        options: { position: "topleft" },
        onAdd: function () {
          const bar = L.DomUtil.create("div", "leaflet-bar crowd-center-btn");
          const btn = L.DomUtil.create("a", "", bar);
          btn.href = "#";
          btn.title = t("crowdCenterOn");
          btn.setAttribute("role", "button");
          btn.setAttribute("aria-label", t("crowdCenterOn"));
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
          L.DomEvent.disableClickPropagation(bar);
          L.DomEvent.on(btn, "click", function (e) {
            L.DomEvent.preventDefault(e);
            crowdCenterOnMe();
          });
          return bar;
        }
      });
      new Ctrl().addTo(crowdMap);
    }
    function crowdEnsureLeaflet(done) {
      if (!document.getElementById("crowdLeafletCss")) {
        const css = document.createElement("link");
        css.id = "crowdLeafletCss";
        css.rel = "stylesheet";
        css.href = "vendor/leaflet/leaflet.css";
        document.head.appendChild(css);
      }
      if (window.L) {
        done();
        return;
      }
      const js = document.getElementById("crowdLeafletJs") || document.createElement("script");
      if (!js.id) {
        js.id = "crowdLeafletJs";
        js.src = "vendor/leaflet/leaflet.js";
        js.onload = function () { done(); };
        js.onerror = function () { done(); };
        document.head.appendChild(js);
      } else {
        setTimeout(function () { crowdEnsureLeaflet(done); }, 200);
      }
    }
    function crowdPaintLastPin(points) {
      const line = document.getElementById("crowdLastPin");
      if (!line) return;
      if (!points || !points.length) {
        line.textContent = t("crowdLastPinEmpty");
        return;
      }
      const last = points.slice().sort(function (a, b) { return (b.t || 0) - (a.t || 0); })[0];
      const agoMin = Math.max(1, Math.round((Date.now() - last.t) / 60000));
      line.textContent = t("crowdLastPin")
        .replace("{bridge}", crowdBridgeLabel(last.bridge))
        .replace("{lat}", Number(last.lat).toFixed(4))
        .replace("{lng}", Number(last.lng).toFixed(4))
        .replace("{ago}", t("crowdAgo").replace("{n}", String(agoMin)));
    }
    function crowdPaintMap(points) {
      crowdPaintLastPin(points);
      const el = document.getElementById("crowdMapEl");
      if (!el || !window.L) return;
      crowdDropMap();
      crowdMapPoints = points || [];
      crowdMap = L.map(el, { zoomControl: true, attributionControl: true }).setView([25.895, -97.50], 12);
      crowdAddCenterControl();
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: "Tiles © Esri"
      }).addTo(crowdMap);
      const pts = points || [];
      const bounds = [];
      pts.forEach(function (p) {
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color: "#0b1f3a",
          weight: 2,
          fillColor: "#38bdf8",
          fillOpacity: 0.95
        }).addTo(crowdMap);
        const agoMin = Math.max(1, Math.round((Date.now() - p.t) / 60000));
        m.bindPopup(
          crowdBridgeLabel(p.bridge) + " · " + crowdLaneLabel(p.lane) + "<br>" +
          Number(p.lat).toFixed(4) + ", " + Number(p.lng).toFixed(4) + "<br>" +
          t("crowdAgo").replace("{n}", String(agoMin))
        );
        bounds.push([p.lat, p.lng]);
      });
      const here = currentGeoFix();
      if (here) {
        crowdMarkHere(here.lat, here.lng);
      } else if (bounds.length === 1) {
        crowdMap.setView(bounds[0], 14);
      } else if (bounds.length > 1) {
        crowdMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
      }
      refreshGeoIfGranted({ enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }).then(function (fix) {
        if (fix && crowdMap) crowdMarkHere(fix.lat, fix.lng);
      });
      setTimeout(function () {
        if (crowdMap) crowdMap.invalidateSize();
      }, 250);
    }
    function crowdLoadHeat() {
      const el = document.getElementById("crowdMapEl");
      if (!el) return;
      const box = document.getElementById("crowdSource");
      if (box && !box.open) return;
      const base = crowdProxyBase();
      crowdEnsureLeaflet(function () {
        if (!base) {
          crowdPaintMap([]);
          return;
        }
        fetch(base + "/checkins/heat")
          .then(function (res) { return res.json(); })
          .then(function (j) { crowdPaintMap((j && j.points) || []); })
          .catch(function () { crowdPaintMap([]); });
      });
    }
    function syncCrowdAria(box) {
      const open = !!(box && box.open);
      const summary = box && box.querySelector("summary");
      if (summary) summary.setAttribute("aria-expanded", open ? "true" : "false");
      const btn = box && box.querySelector(".crowd-collapse");
      if (btn) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        const label = btn.querySelector(".crowd-collapse-text");
        if (label) label.textContent = t("crowdCollapse");
      }
      document.querySelectorAll("a.report-wait-link").forEach(function (link) {
        link.setAttribute("aria-controls", "crowdSource");
        link.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    function crowdSectionHtml() {
      let open = false;
      try { open = localStorage.getItem(CROWD_OPEN_KEY) === "1"; } catch (_) { /* ignore */ }
      const expanded = open ? "true" : "false";
      return `<details class="crowd-source" id="crowdSource"${open ? " open" : ""}>
        <summary aria-expanded="${expanded}" aria-controls="crowdSourceBody">
          <span class="crowd-chevron" aria-hidden="true">
            <svg class="crowd-chevron-closed" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg class="crowd-chevron-open" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="crowd-title">${escapeHtml(t("crowdTitle"))}</span>
          <span class="crowd-sub">${escapeHtml(t("crowdSub"))}</span>
          <span class="crowd-near-dot" id="crowdNearDot" hidden></span>
        </summary>
        <button type="button" class="crowd-collapse" aria-expanded="${expanded}" aria-controls="crowdSourceBody">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 14l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="visually-hidden crowd-collapse-text">${escapeHtml(t("crowdCollapse"))}</span>
        </button>
        <div class="crowd-body" id="crowdSourceBody">${crowdFormHtml()}</div>
      </details>`;
    }
    function ensureCrowdSection() {
      const mount = document.getElementById("crowdMount");
      if (!mount || document.getElementById("crowdSource")) return;
      mount.innerHTML = crowdSectionHtml();
      crowdBind();
      const box = document.getElementById("crowdSource");
      if (box && box.open) {
        crowdStartPoll();
        crowdLoadSummary();
      }
    }
    function openCrowdReport(event) {
      if (event) event.preventDefault();
      ensureCrowdSection();
      const box = document.getElementById("crowdSource");
      if (!box) return;
      const willOpen = !box.open;
      box.open = willOpen;
      syncCrowdAria(box);
      if (willOpen) box.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function openCrowdFromHash() {
      ensureCrowdSection();
      const box = document.getElementById("crowdSource");
      if (!box) return;
      if (!box.open) box.open = true;
      syncCrowdAria(box);
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function driveWaitTone(mins) {
      return waitToneClass(mins);
    }
    function driveSortWait(a, b, kind) {
      const aw = kind === "ped" ? drivePedMinutes(a) : passengerVehicleWait(a);
      const bw = kind === "ped" ? drivePedMinutes(b) : passengerVehicleWait(b);
      if (aw == null && bw == null) return 0;
      if (aw == null) return 1;
      if (bw == null) return -1;
      return aw - bw;
    }
    function drivePedMinutes(port) {
      const summary = summarizeMode(port.sections || [], "pedestrian");
      if (!summary || !summary.primary || !isActiveWait(summary.primary)) return null;
      return summary.primary.minutes;
    }
    function driveWaitPillHtml(topHtml, mid, bot) {
      let body = topHtml || "";
      if (mid) body += `<div class="drive-wait-mid">${escapeHtml(mid)}</div>`;
      if (bot) body += `<div class="drive-wait-bot">${escapeHtml(bot)}</div>`;
      if (!body) return "—";
      return `<div class="drive-wait-tile">${body}</div>`;
    }
    function driveSectionTopHtml(section, commercial) {
      if (!section) return { html: "", tone: "" };
      let genMins = null;
      let specialMins = null;
      const specialRe = commercial ? /fast/i : /ready/i;
      sortLanes(section.lanes || []).forEach(function (lane) {
        if (!isActiveWait(lane.wait)) return;
        if (/general/i.test(lane.name) && !/ready|sentri|fast|nexus/i.test(lane.name)) {
          genMins = lane.wait.minutes;
        } else if (specialRe.test(lane.name)) {
          specialMins = lane.wait.minutes;
        }
      });
      const specialLab = commercial ? t("fast") : t("ready");
      if (genMins != null && specialMins != null && genMins !== specialMins) {
        return {
          html: `<div class="drive-wait-top-dual">
            <span><span class="lab">${escapeHtml(t("gen"))}</span> <span class="val ${driveWaitTone(genMins)}">${genMins}<span class="unit"> Min</span></span></span>
            <span><span class="lab">${escapeHtml(specialLab)}</span> <span class="val ${driveWaitTone(specialMins)}">${specialMins}<span class="unit"> Min</span></span></span>
          </div>`,
          tone: driveWaitTone(Math.max(genMins, specialMins))
        };
      }
      const mins = genMins != null ? genMins : specialMins;
      if (mins == null) return { html: "", tone: "" };
      return {
        html: `<div class="drive-wait-top ${driveWaitTone(mins)}">${mins}<span class="unit"> Min</span></div>`,
        tone: driveWaitTone(mins)
      };
    }
    function drivePedWaitPack(port) {
      const sec = sectionByKey(port, "pedestrian");
      const top = driveSectionTopHtml(sec, false);
      const mid = genReadySplit(sec, false);
      const bot = sectionOfLine(sec);
      if (!top.html && !mid && !bot) {
        return { html: "—", cls: "", openBits: [] };
      }
      return {
        html: driveWaitPillHtml(top.html, mid, bot),
        cls: "has-tile",
        openBits: []
      };
    }
    function driveVehicleWaitPack(port) {
      const sec = sectionByKey(port, "passenger");
      const top = driveSectionTopHtml(sec, false);
      const mid = genReadySplit(sec, false);
      const bot = sectionOfLine(sec);
      if (!top.html && !mid && !bot) {
        return { html: "—", cls: "", openBits: [] };
      }
      return {
        html: driveWaitPillHtml(top.html, mid, bot),
        cls: "has-tile",
        openBits: []
      };
    }
    /** Drive Vehicles only: SENTRI chip in Gen/Ready count format; N/A label only if no lane. */
    function driveSentriChipHtml(port) {
      const wait = laneWaitForShare(port, "sentri");
      if (!(wait && isActiveWait(wait))) {
        return driveWaitPillHtml(
          `<div class="drive-wait-na">${escapeHtml(t("na"))}</div>`,
          "",
          ""
        );
      }
      const topHtml = `<div class="drive-wait-top ${driveWaitTone(wait.minutes)}">${wait.minutes}<span class="unit"> Min</span></div>`;
      let mid = "";
      const n = wait.lanesOpenCount != null ? Number(wait.lanesOpenCount) : NaN;
      if (!isNaN(n)) mid = n + " " + t("sentri");
      const bot = sectionOfLine(sectionByKey(port, "passenger"));
      return driveWaitPillHtml(topHtml, mid, bot);
    }
    function driveCardHtml(port, kind) {
      const hoursLabel = formatHoursOfOperation(port.hours);
      const portStamp = collectPortAsOf(port);
      const updatedLabel = formatBridgeUpdated(portStamp);
      const updatedHtml = updatedLabel
        ? `<div class="drive-updated">${escapeHtml(t("bridgeUpdated"))} ${escapeHtml(updatedLabel)}</div>`
        : "";
      let waitHtml;
      let waitCls;
      let openBits;
      if (kind === "ped") {
        const pack = drivePedWaitPack(port);
        waitHtml = `<div class="drive-waits">${pack.html}</div>`;
        waitCls = pack.cls;
        openBits = pack.openBits;
      } else {
        const pack = driveVehicleWaitPack(port);
        waitHtml = `<div class="drive-waits">${pack.html}${driveSentriChipHtml(port)}</div>`;
        waitCls = pack.cls;
        openBits = pack.openBits;
      }
      return `<article class="drive-card">
        <div>
          ${bridgeTitleHtml(port, "drive-name")}
          <div class="drive-hours">${escapeHtml(hoursLabel)}</div>
          ${updatedHtml}
        </div>
        <div class="drive-wait ${waitCls}">${waitHtml}</div>
        ${openBits.length ? `<div class="drive-open">${openBits.map(escapeHtml).join("<br>")}</div>` : ""}
      </article>`;
    }
    function driveListHtml(ports, kind) {
      return '<div class="drive-list">' + ports.map(function (port) {
        return driveCardHtml(port, kind);
      }).join("") + "</div>";
    }
    function renderDriveView(data) {
      const grid = document.getElementById("portGrid");
      if (!grid) return;
      const vehiclePorts = (data.items || []).filter(function (p) {
        return summarizeMode(p.sections, "passenger");
      }).sort(function (a, b) { return driveSortWait(a, b, "vehicle"); });
      const walkPorts = (data.items || []).filter(function (p) {
        return summarizeMode(p.sections, "pedestrian");
      }).sort(function (a, b) { return driveSortWait(a, b, "ped"); });
      if (!vehiclePorts.length && !walkPorts.length) {
        grid.innerHTML = `<p class="empty">${escapeHtml(t("emptyFilter"))}</p>`;
        return;
      }
      let html = "";
      if (vehiclePorts.length) {
        html += `<div class="drive-heading">${escapeHtml(t("crowdVehicles"))}</div>` + driveListHtml(vehiclePorts, "vehicle");
      }
      if (walkPorts.length) {
        html += `<div class="drive-heading">${escapeHtml(t("filterPedestrian"))}</div>` + driveListHtml(walkPorts, "ped");
      }
      grid.innerHTML = html;
    }

    function renderPorts(data) {
      const grid = document.getElementById("portGrid");
      const tableRows = [];
      ensureCrowdSection();
      const crowdBox = document.getElementById("crowdSource");
      if (!crowdBox || !crowdBox.open) crowdStopPoll();

      const newestAsOf = collectAsOf(data);
      let pendingCount = 0;
      let numericCount = 0;
      for (const port of data.items) {
        for (const sec of port.sections) {
          for (const lane of sec.lanes) {
            if (lane.wait.pending) pendingCount++;
            if (isActiveWait(lane.wait)) numericCount++;
          }
        }
      }
      let asOfText;
      if (numericCount === 0 && pendingCount > 0) {
        asOfText = t("pendingNoTimes");
      } else if (newestAsOf) {
        // One stamp only (newest date + time across bridges)
        asOfText = formatReportStamp(newestAsOf);
      } else {
        asOfText = "—";
      }
      const asofStamp = document.getElementById("asofStamp");
      if (asofStamp) asofStamp.textContent = asOfText;

      if (currentFilter === "drive") {
        renderDriveView(data);
        return;
      }

      // All: Vehicles · SENTRI · Pedestrian · Commercial
      // Pedestrian: one All-style wait column (Ready lives inside that tile)
      // Vehicles / Commercial: primary wait · special column (SENTRI / FAST) when published
      const portsSorted = data.items.slice().sort((a, b) => {
        const an = (a.meta && a.meta.short ? a.meta.short : a.title || "").toLowerCase();
        const bn = (b.meta && b.meta.short ? b.meta.short : b.title || "").toLowerCase();
        return an.localeCompare(bn);
      });
      const portsVisible = portsSorted.filter(portHasActiveForFilter);
      const showSpecialCol = currentFilter === "all" ||
        portsVisible.some((port) => cellHasPublishedWait(bestTrusted(port)));

      const waitCols = [];
      if (currentFilter === "all") {
        waitCols.push({ key: "passenger", label: t("filterVehicles") });
        waitCols.push({ key: "trusted", label: t("sentri") });
        waitCols.push({ key: "pedestrian", label: t("filterPedestrian") });
        waitCols.push({ key: "commercial", label: t("filterCommercial") });
      } else if (currentFilter === "passenger") {
        waitCols.push({ key: "passenger", label: t("filterVehicles") });
        waitCols.push({ key: "trusted", label: t("sentri") });
      } else if (currentFilter === "pedestrian") {
        waitCols.push({ key: "pedestrian", label: t("filterPedestrian") });
      } else if (currentFilter === "commercial") {
        waitCols.push({ key: "commercial", label: t("filterCommercial") });
        waitCols.push({ key: "trusted", label: t("fast") });
      }

      const mobileCards = [];

      for (const port of portsVisible) {
        let cells = {
          passenger: waitCellBlock(summarizeMode(port.sections, "passenger"), "passenger", port),
          pedestrian: waitCellBlock(summarizeMode(port.sections, "pedestrian"), "pedestrian", port),
          commercial: waitCellBlock(summarizeMode(port.sections, "commercial"), "commercial", port),
          trusted: bestTrusted(port)
        };

        Object.keys(cells).forEach((key) => {
          cells[key] = toEmptyNaChip(cells[key]);
        });

        const tdHtml = waitCols.map((c) => {
          const cell = cells[c.key];
          return `<td class="wait-col ${cell.cls}"><div class="wait-col-inner">${waitStackWithOpen(cell)}</div></td>`;
        }).join("");

        const hoursLabel = formatHoursOfOperation(port.hours);
        const portStamp = collectPortAsOf(port);
        const updatedLabel = formatBridgeUpdated(portStamp);
        const updatedHtml = updatedLabel
          ? `<span class="updated-line"><strong>${escapeHtml(t("bridgeUpdated"))}</strong> ${escapeHtml(updatedLabel)}</span>`
          : "";
        const updatedMobile = updatedLabel
          ? `<span class="m-row-updated">${escapeHtml(t("bridgeUpdated"))} ${escapeHtml(updatedLabel)}</span>`
          : "";
        const noticeHtml = noticeBannerHtml(port);
        const colCount = waitCols.length + 1;
        const noticeRow = noticeHtml
          ? `<tr class="notice-row"><td colspan="${colCount}">${noticeHtml}</td></tr>`
          : "";
        const gapRow = `<tr class="band-gap" aria-hidden="true"><td colspan="${colCount}"></td></tr>`;
        tableRows.push(`
          <tr class="${noticeHtml ? "has-notice" : ""}">
            <td class="bridge">
              ${bridgeTitleHtml(port)}
              ${mexicoLineHtml(port, "mx-line")}
              <span class="hours-line"><strong>${escapeHtml(t("hours"))}</strong> ${escapeHtml(hoursLabel)}</span>
              ${updatedHtml}
            </td>
            ${tdHtml}
          </tr>
          ${noticeRow}
          ${gapRow}`);

        // Compact phone cards — labels live in m-head, chips are minutes + counts only
        const waitBlocks = waitCols.map((c) => {
          const cell = cells[c.key];
          return `<div class="m-wait-block ${cell.cls}">${waitStackWithOpen(cell)}</div>`;
        }).join("");

        mobileCards.push(`
          <article class="m-row">
            <div>
              ${bridgeTitleHtml(port, "m-row-bridge")}
              ${mexicoLineHtml(port, "m-row-mx")}
              <span class="m-row-hours">${escapeHtml(hoursLabel)}</span>
              ${updatedMobile}
            </div>
            <div class="m-row-waits">${waitBlocks}</div>
            ${noticeHtml ? `<div class="m-row-notice">${noticeHtml}</div>` : ""}
          </article>`);
      }

      if (!tableRows.length) {
        grid.innerHTML = `<p class="empty">${escapeHtml(t("emptyFilter"))}</p>`;
        return;
      }

      // Desktop: table-cards ribbon + chips. Mobile: All/Pedestrian keep the ribbon;
      // Vehicles/Commercial use phone cards (labels over chips).
      const waitN = Math.max(waitCols.length, 1);
      const isNarrow =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 720px)").matches;
      const twoChipMobile =
        isNarrow &&
        (currentFilter === "commercial" || currentFilter === "passenger");
      const useCards = !twoChipMobile;
      const tight = twoChipMobile;
      let bridgePct;
      if (waitN === 1) bridgePct = useCards ? 58 : 42;
      else if (waitN === 2) bridgePct = 36;
      else if (waitN === 3) bridgePct = 28;
      else bridgePct = 20;
      const waitPct = ((100 - bridgePct) / waitN).toFixed(3);
      const colgroup =
        `<col class="c-bridge" style="width:${bridgePct}%" />` +
        waitCols.map(() => `<col class="c-wait" style="width:${waitPct}%" />`).join("");

      const headCols = waitCols.map((c) =>
        `<th scope="col"${c.key === "trusted" ? ' class="th-lane"' : ""}><div class="wait-col-inner wait-head-label">${escapeHtml(c.label)}</div></th>`
      ).join("");

      const tightClass = tight
        ? ` table-tight table-tight-${waitN}`
        : "";
      const cardsClass = useCards
        ? (waitN === 1 ? " table-cards table-cards-1" : " table-cards")
        : "";

      const mobileHead =
        `<div class="m-head" role="row">` +
        `<span class="m-head-port">${escapeHtml(t("colBridge"))}</span>` +
        `<div class="m-head-waits">` +
        waitCols.map(function (c) {
          return `<span class="m-head-lab${c.key === "trusted" ? " lane-type" : ""}">${escapeHtml(c.label)}</span>`;
        }).join("") +
        `</div></div>`;

      grid.innerHTML = `
        <div class="table-wrap${tightClass}${cardsClass}" style="--wait-n:${waitN}">
          <div class="table-scroll">
            <table class="wait-table">
              <colgroup>${colgroup}</colgroup>
              <thead>
                <tr>
                  <th scope="col" class="th-bridge">${escapeHtml(t("colBridge"))}</th>
                  ${headCols}
                </tr>
              </thead>
              <tbody>
                ${tableRows.join("")}
              </tbody>
            </table>
          </div>
          <div class="mobile-cards">
            ${mobileHead}
            ${mobileCards.join("")}
          </div>
        </div>`;

      // Match every wait chip to the largest message (uniform width + height)
      syncMexicoNameVisibility();
      requestAnimationFrame(function () {
        equalizeAllFilterChipHeights();
      });
    }

    function remPx(n) {
      const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return (Number.isFinite(fs) ? fs : 16) * n;
    }

    function equalizeChipGroup(nodes, minRem) {
      if (!nodes.length) return;
      nodes.forEach(function (el) {
        el.style.width = "max-content";
        el.style.minWidth = "";
        el.style.maxWidth = "100%";
        el.style.height = "auto";
        el.style.minHeight = "";
      });
      // Force layout before measuring column caps
      void (nodes[0] && nodes[0].offsetWidth);
      let maxW = 0;
      let maxH = 0;
      let availW = Infinity;
      nodes.forEach(function (el) {
        maxW = Math.max(maxW, Math.ceil(el.scrollWidth), Math.ceil(el.offsetWidth));
        maxH = Math.max(maxH, Math.ceil(el.scrollHeight), Math.ceil(el.offsetHeight));
        const host = el.closest("td.wait-col") || el.parentElement;
        if (!host) return;
        const inner = Math.floor(host.getBoundingClientRect().width) - 8;
        if (inner > 4) availW = Math.min(availW, inner);
      });
      maxW = Math.max(maxW, Math.round(remPx(minRem)));
      if (availW !== Infinity) maxW = Math.min(maxW, availW);
      if (maxW < 1 || maxH < 1) return;
      const w = maxW + "px";
      const h = maxH + "px";
      nodes.forEach(function (el) {
        el.style.width = w;
        el.style.minWidth = w;
        el.style.maxWidth = w;
        el.style.height = h;
        el.style.minHeight = h;
      });
    }

    /** Match mobile header labels to equalized chip widths (and Port to name column). */
    function alignMobileHeadToChips() {
      const cards = document.querySelector(".mobile-cards");
      if (!cards || getComputedStyle(cards).display === "none") return;
      const headWaits = cards.querySelector(".m-head-waits");
      const firstRow = cards.querySelector(".m-row .m-row-waits");
      if (!headWaits || !firstRow) return;
      const labs = headWaits.querySelectorAll(".m-head-lab");
      const chips = firstRow.querySelectorAll(".m-wait-block");
      if (labs.length && labs.length === chips.length) {
        chips.forEach(function (chip, i) {
          const w = Math.ceil(chip.getBoundingClientRect().width);
          if (!labs[i] || w < 1) return;
          labs[i].style.width = w + "px";
          labs[i].style.minWidth = w + "px";
          labs[i].style.maxWidth = w + "px";
        });
      }
      const headPort = cards.querySelector(".m-head-port");
      const rowPort = cards.querySelector(".m-row > div:first-child");
      if (headPort && rowPort) {
        const w = Math.ceil(rowPort.getBoundingClientRect().width);
        if (w > 0) {
          headPort.style.width = w + "px";
          headPort.style.maxWidth = w + "px";
          headPort.style.minWidth = "0";
        }
      }
    }

    /** Stretch chips in a row to nearly the Port ribbon / name-column height. */
    function stretchChipsToRibbon(rowSel, ribbonSel, chipSel, minRem) {
      document.querySelectorAll(rowSel).forEach(function (row) {
        if (row.classList.contains("notice-row") || row.classList.contains("band-gap")) return;
        const ribbon = row.querySelector(ribbonSel);
        const chips = row.querySelectorAll(chipSel);
        if (!ribbon || !chips.length) return;
        const rh = Math.floor(ribbon.getBoundingClientRect().height);
        if (rh < 1) return;
        const h = Math.max(Math.round(remPx(minRem)), rh - 6) + "px";
        chips.forEach(function (el) {
          el.style.height = h;
          el.style.minHeight = h;
        });
      });
    }

    /**
     * Equalize chip WIDTH per column (not globally). Global equalize made every
     * chip as wide as Gateway's dual Gen/Ready, which overflowed columns and
     * misaligned headers (All / Pedestrian / Vehicles / Commercial).
     */
    function equalizeAllFilterChipHeights() {
      const isNarrow = window.matchMedia("(max-width: 720px)").matches;
      // Desktop flex ribbon sizes columns/chips — skip JS widths/heights there.
      if (!isNarrow) return;
      const minRem = 5.75;
      const table = document.querySelector("#portGrid .table-wrap.table-cards .wait-table");
      if (table) {
        const bodyRows = Array.prototype.filter.call(
          table.querySelectorAll("tbody tr"),
          function (tr) {
            return !tr.classList.contains("notice-row") && !tr.classList.contains("band-gap");
          }
        );
        const waitColCount = Math.max(0, table.querySelectorAll("thead th").length - 1);
        for (let i = 0; i < waitColCount; i++) {
          const colStacks = [];
          bodyRows.forEach(function (tr) {
            const td = tr.querySelectorAll("td.wait-col")[i];
            const stack = td && td.querySelector(".wait-stack");
            if (stack) colStacks.push(stack);
          });
          equalizeChipGroup(colStacks, minRem);
          const headInner = table.querySelectorAll("thead th:not(.th-bridge) .wait-head-label")[i];
          const sample = colStacks[0];
          if (headInner && sample) {
            const w = Math.ceil(sample.getBoundingClientRect().width);
            if (w > 0) {
              headInner.style.width = w + "px";
              headInner.style.minWidth = w + "px";
              headInner.style.maxWidth = w + "px";
            }
          }
        }
        stretchChipsToRibbon(
          "#portGrid .table-wrap.table-cards .wait-table tbody tr",
          "td.bridge",
          "td.wait-col .wait-stack",
          minRem
        );
      }

      const mobileRows = document.querySelectorAll(".mobile-cards .m-row");
      if (mobileRows.length) {
        const chipCount = mobileRows[0].querySelectorAll(".m-wait-block").length;
        for (let i = 0; i < chipCount; i++) {
          const colChips = [];
          mobileRows.forEach(function (row) {
            const chip = row.querySelectorAll(".m-wait-block")[i];
            if (chip) colChips.push(chip);
          });
          equalizeChipGroup(colChips, 5.5);
        }
        stretchChipsToRibbon(
          ".mobile-cards .m-row",
          ":scope > div:first-child",
          ".m-wait-block",
          5.5
        );
        alignMobileHeadToChips();
      }
    }

    function render(data, sourceLabel, isLive) {
      lastData = data;
      document.getElementById("liveLabel").textContent = sourceLabel;
      const pulse = document.getElementById("livePulse");
      pulse.classList.toggle("cached", !isLive);
      updateSummary(data);
      renderPorts(data);
    }

    async function fetchText(url, options) {
      options = options || {};
      const bust = url.includes("?") ? "&" : "?";
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = controller
        ? setTimeout(function () { controller.abort(); }, options.timeoutMs || 12000)
        : null;
      try {
        const res = await fetch(url + bust + "t=" + Date.now(), {
          cache: "no-store",
          credentials: "omit",
          mode: "cors",
          signal: controller ? controller.signal : undefined
        });
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        let text = await res.text();
        // allorigins /get wraps the body: { contents: "<rss…>" }
        if (
          options.unwrap === "allorigins" ||
          (text && text.trimStart().charAt(0) === "{" && text.indexOf('"contents"') !== -1)
        ) {
          try {
            const j = JSON.parse(text);
            if (j && typeof j.contents === "string") text = j.contents;
          } catch (_) { /* keep raw text */ }
        }
        // Broken free proxies often return a marketing HTML page
        if (text && /<html[\s>]/i.test(text) && text.indexOf("<item>") === -1) {
          throw new Error("Proxy returned HTML, not RSS");
        }
        if (!text || text.indexOf("<item>") === -1) {
          throw new Error("Invalid feed (no items) from " + url);
        }
        return text;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    function dataSources(opts) {
      opts = opts || {};
      // Hybrid path (most → least preferred):
      // 1) Cloudflare Worker → live CBP XML + CORS
      // 2) Same-origin GitHub Pages mirror (fast, may lag a few minutes)
      // 3) GitHub raw mirror
      const sources = [];

      if (FEED_PROXY_URL && String(FEED_PROXY_URL).trim()) {
        let proxyUrl = String(FEED_PROXY_URL).replace(/\/$/, "");
        // Manual Refresh bypasses the Worker edge cache so the as-of hour matches CBP
        if (opts.forceFresh) {
          proxyUrl += (proxyUrl.indexOf("?") >= 0 ? "&" : "?") + "fresh=1";
        }
        sources.push({
          url: proxyUrl,
          id: "liveProxy",
          live: true,
          timeoutMs: opts.forceFresh ? 12000 : 8000
        });
      }

      try {
        sources.push({
          url: new URL(LOCAL_FEED_URL, location.href).href,
          id: "cachedMirror",
          live: false,
          timeoutMs: 5000
        });
      } catch (_) { /* ignore */ }

      sources.push({
        url: "https://raw.githubusercontent.com/EliseoCab/brownsville-wait-times/main/data/bwt.xml",
        id: "cachedGithub",
        live: false,
        timeoutMs: 6000
      });

      return sources;
    }

    let refreshFeedbackTimer = null;

    function setRefreshButtonState(state) {
      // state: idle | loading | success | error
      const btn = document.getElementById("refreshBtn");
      const label = document.getElementById("refreshBtnLabel");
      const toast = document.getElementById("refreshToast");
      if (!btn || !label) return;

      btn.classList.remove("is-loading", "is-success", "is-error");
      if (refreshFeedbackTimer) {
        clearTimeout(refreshFeedbackTimer);
        refreshFeedbackTimer = null;
      }

      if (state === "loading") {
        btn.disabled = true;
        btn.classList.add("is-loading");
        label.textContent = t("refreshing");
        if (toast) {
          toast.classList.remove("show", "ok", "err");
          toast.textContent = "";
        }
        return;
      }

      if (state === "success") {
        btn.disabled = true;
        btn.classList.add("is-success");
        label.textContent = t("updated");
        if (toast) {
          toast.textContent = t("toastOk");
          toast.classList.remove("err");
          toast.classList.add("ok", "show");
        }
        refreshFeedbackTimer = setTimeout(() => setRefreshButtonState("idle"), 1800);
        return;
      }

      if (state === "error") {
        btn.disabled = true;
        btn.classList.add("is-error");
        label.textContent = t("failed");
        if (toast) {
          toast.textContent = t("toastErr");
          toast.classList.remove("ok");
          toast.classList.add("err", "show");
        }
        refreshFeedbackTimer = setTimeout(() => setRefreshButtonState("idle"), 2200);
        return;
      }

      // idle
      btn.disabled = false;
      label.textContent = t("refresh");
      if (toast) {
        toast.classList.remove("show", "ok", "err");
        toast.textContent = "";
      }
    }

    async function loadData(fromAuto, isUserClick) {
      if (isLoading) return;
      isLoading = true;
      const alert = document.getElementById("alertBox");
      // Cool feedback only when the user taps Refresh (not initial load / auto-refresh)
      const manual = !!isUserClick;

      if (manual) setRefreshButtonState("loading");
      else {
        const btn = document.getElementById("refreshBtn");
        if (btn) btn.disabled = true;
      }

      document.getElementById("liveLabel").textContent = fromAuto ? t("autoRefreshing") : t("refreshing");

      const errors = [];
      let loaded = false;

      for (const src of dataSources({ forceFresh: manual })) {
        try {
          const text = await fetchText(src.url, {
            unwrap: src.unwrap,
            timeoutMs: src.timeoutMs || 8000
          });
          let data;
          try {
            data = parseRss(text);
          } catch (parseErr) {
            errors.push(t(src.id || "liveCbp") + " parse: " + parseErr.message);
            continue;
          }
          if (!data.items || !data.items.length) {
            errors.push(t(src.id || "liveCbp") + ": empty items");
            continue;
          }
          lastXmlText = text;
          lastSourceId = src.id || "liveCbp";
          lastIsLive = !!src.live;
          lastFromAuto = !!fromAuto;
          const label = lastFromAuto ? t(lastSourceId) + " · " + t("autoRefreshed") : t(lastSourceId);
          render(data, label, lastIsLive);
          alert.classList.remove("show");
          alert.innerHTML = "";
          loaded = true;
          break;
        } catch (e) {
          errors.push((src.id ? t(src.id) : src.url) + ": " + (e && e.message ? e.message : String(e)));
        }
      }

      if (!loaded) {
        if (lastData && fromAuto) {
          document.getElementById("liveLabel").textContent = t("refreshFailed");
          document.getElementById("livePulse").classList.add("cached");
        } else {
          const hasStaticWaits = !!document.querySelector("#portGrid .static-waits");
          if (!hasStaticWaits) {
            try {
              render(parseRss(FALLBACK_RSS), t("snapshot"), false);
            } catch (_) {
              document.getElementById("liveLabel").textContent = t("errorLoad");
            }
          } else {
            document.getElementById("liveLabel").textContent = t("snapshot");
          }
          const isFile = location.protocol === "file:";
          alert.innerHTML =
            "<div><strong>" + escapeHtml(t("alertSnapshot")) + "</strong> " +
            (isFile
              ? escapeHtml(t("alertFile"))
              : escapeHtml(t("alertFail")) + " <a href=\"https://bwt.cbp.gov\" target=\"_blank\" rel=\"noopener\">bwt.cbp.gov</a>.") +
            (errors.length ? "<br><small style=\"opacity:.85\">" + escapeHtml(errors.slice(0, 3).join(" · ")) + "</small>" : "") +
            "</div>";
          alert.classList.add("show");
          console.warn("Wait times load failed:", errors);
        }
        if (manual) setRefreshButtonState("error");
      } else if (manual) {
        setRefreshButtonState("success");
      } else {
        const btn = document.getElementById("refreshBtn");
        if (btn && !btn.classList.contains("is-success") && !btn.classList.contains("is-error")) {
          btn.disabled = false;
        }
      }

      isLoading = false;
      if (!manual) {
        const btn = document.getElementById("refreshBtn");
        if (btn && !btn.classList.contains("is-success") && !btn.classList.contains("is-error")) {
          btn.disabled = false;
        }
      }
      scheduleAutoRefresh();
    }

    function applyStaticLang() {
      document.documentElement.lang = currentLang === "es" ? "es" : "en";
      document.title = t("pageTitle");
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", t("pageDesc"));
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", t("pageTitle"));
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", t("pageDesc"));
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        el.textContent = t(el.getAttribute("data-i18n"));
      });
      document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
      });
      document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
        el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
      });
      const enBtn = document.getElementById("langEn");
      const esBtn = document.getElementById("langEs");
      if (enBtn) enBtn.classList.toggle("active", currentLang === "en");
      if (esBtn) esBtn.classList.toggle("active", currentLang === "es");
      syncMexicoNameVisibility();
      const themeBtn = document.getElementById("themeToggle");
      const theme = document.documentElement.getAttribute("data-theme") || "light";
      if (themeBtn) {
        themeBtn.setAttribute("aria-label", theme === "dark" ? t("themeToLight") : t("themeToDark"));
        themeBtn.title = theme === "dark" ? t("themeToLight") : t("themeToDark");
      }
    }

    function setLang(lang) {
      if (lang !== "en" && lang !== "es") return;
      currentLang = lang;
      try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* ignore */ }
      applyStaticLang();
      if (document.getElementById("crowdSource")) {
        crowdRerenderForm();
        syncCrowdAria(document.getElementById("crowdSource"));
      }
      const help = document.getElementById("installHelp");
      if (help && !help.hidden) fillInstallHelp();
      if (lastXmlText) {
        const data = parseRss(lastXmlText);
        const label = lastFromAuto ? t(lastSourceId || "liveProxy") + " · " + t("autoRefreshed") : t(lastSourceId || "liveProxy");
        render(data, label, lastIsLive);
      } else if (lastData) {
        render(lastData, t(lastSourceId || "liveProxy"), lastIsLive);
      }
      updateCountdown();
      refreshLiveCamsStatusCopy();
      document.querySelectorAll(".live-cam-card").forEach(function (card) {
        const tag = card.querySelector(".live-cam-tag");
        if (!tag) return;
        tag.textContent = card.classList.contains("is-live") ? t("liveCamLive") : t("liveCamStill");
      });
    }

    function currentTheme() {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    let liveCamsState = "checking"; // checking | online | offline
    let liveCamsOnlineCount = 0;
    let liveCamsTimer = null;

    function refreshLiveCamsStatusCopy() {
      const status = document.getElementById("liveCamsStatus");
      if (!status) return;
      if (liveCamsState === "checking") status.textContent = t("liveCamsChecking");
      else if (liveCamsState === "offline") status.textContent = t("liveCamsOffline");
      else if (liveCamsState === "partial") status.textContent = t("liveCamsPartial");
      else status.textContent = "";
    }

    function probeCameraSnapshot(alias, timeoutMs) {
      return new Promise(function (resolve) {
        const img = new Image();
        let settled = false;
        const timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          try { img.src = ""; } catch (_) { /* ignore */ }
          resolve(false);
        }, timeoutMs || 8000);
        img.onload = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(!!(img.naturalWidth && img.naturalWidth > 16));
        };
        img.onerror = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(false);
        };
        img.referrerPolicy = "no-referrer";
        img.decoding = "async";
        img.src =
          "https://g3.ipcamlive.com/player/snapshot.php?alias=" +
          encodeURIComponent(alias) +
          "&_=" +
          Date.now();
      });
    }

    function cameraSnapshotUrl(alias) {
      return (
        "https://g3.ipcamlive.com/player/snapshot.php?alias=" +
        encodeURIComponent(alias) +
        "&_=" +
        Date.now()
      );
    }

    function activateLiveCam(card) {
      if (!card || card.classList.contains("is-live")) return;
      const frame = card.querySelector("iframe");
      const src = frame && frame.getAttribute("data-src");
      if (frame && src) {
        frame.removeAttribute("hidden");
        if (frame.getAttribute("src") !== src) frame.setAttribute("src", src);
      }
      card.classList.add("is-live");
      const tag = card.querySelector(".live-cam-tag");
      if (tag) tag.textContent = t("liveCamLive");
    }

    function bindLiveCamStill(card) {
      const btn = card.querySelector(".live-cam-still");
      if (!btn || btn.getAttribute("data-bound") === "1") return;
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        activateLiveCam(card);
      });
    }

    async function setupLiveCams() {
      const section = document.getElementById("liveCams");
      const grid = document.getElementById("liveCamsGrid");
      if (!section || !grid) return;

      const cards = Array.prototype.slice.call(
        section.querySelectorAll(".live-cam-card[data-cam-alias]")
      );
      if (!cards.length) return;

      liveCamsState = "checking";
      liveCamsOnlineCount = 0;
      section.setAttribute("data-state", "checking");
      cards.forEach(function (card) {
        if (card.classList.contains("is-live")) return;
        card.hidden = true;
        const frame = card.querySelector("iframe");
        if (frame) {
          frame.removeAttribute("src");
          frame.setAttribute("hidden", "");
        }
      });
      grid.classList.remove("live-cams-grid-one");
      refreshLiveCamsStatusCopy();

      const results = await Promise.all(
        cards.map(function (card) {
          const alias = card.getAttribute("data-cam-alias");
          return probeCameraSnapshot(alias, 8000).then(function (ok) {
            return { card: card, ok: ok };
          });
        })
      );

      let online = 0;
      results.forEach(function (r) {
        if (!r.ok && !r.card.classList.contains("is-live")) {
          r.card.hidden = true;
          return;
        }
        online += 1;
        r.card.hidden = false;
        bindLiveCamStill(r.card);
        if (r.card.classList.contains("is-live")) return;
        const alias = r.card.getAttribute("data-cam-alias");
        const shot = r.card.querySelector(".live-cam-shot");
        if (shot) shot.src = cameraSnapshotUrl(alias);
        const tag = r.card.querySelector(".live-cam-tag");
        if (tag) tag.textContent = t("liveCamStill");
      });

      liveCamsOnlineCount = online;
      if (online === 0) {
        liveCamsState = "offline";
        section.setAttribute("data-state", "offline");
        grid.classList.remove("live-cams-grid-one");
      } else if (online === 1) {
        liveCamsState = "partial";
        section.setAttribute("data-state", "partial");
        grid.classList.add("live-cams-grid-one");
      } else {
        liveCamsState = "online";
        section.setAttribute("data-state", "online");
        grid.classList.remove("live-cams-grid-one");
      }
      refreshLiveCamsStatusCopy();

      if (liveCamsTimer) clearTimeout(liveCamsTimer);
      liveCamsTimer = setTimeout(
        setupLiveCams,
        online === 0 ? 2 * 60 * 1000 : 10 * 60 * 1000
      );
    }

    function applyTheme(theme, persist) {
      document.documentElement.setAttribute("data-theme", theme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme === "dark" ? "#07101c" : "#0b1f3a");
      if (persist) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (_) { /* ignore */ }
      }
      const themeBtn = document.getElementById("themeToggle");
      if (themeBtn) {
        themeBtn.setAttribute("aria-label", theme === "dark" ? t("themeToLight") : t("themeToDark"));
        themeBtn.title = theme === "dark" ? t("themeToLight") : t("themeToDark");
      }
    }

    function dfoPostsUrl() {
      const base = (FEED_PROXY_URL && String(FEED_PROXY_URL).trim())
        ? String(FEED_PROXY_URL).replace(/\/$/, "")
        : "https://brownsville-bwt.borderwait.workers.dev";
      return base + "/x/dfolaredo";
    }

    function formatPostTime(iso) {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
      } catch (_) {
        return "";
      }
    }

    function renderDfoCarousel(payload) {
      const host = document.getElementById("dfoTimeline");
      if (!host) return;
      const user = payload && payload.user;
      const posts = (payload && payload.posts) || [];
      if (!posts.length) {
        host.innerHTML =
          `<p class="x-timeline-fallback">${escapeHtml(t("xUpdatesFallback"))} ` +
          `<a href="https://x.com/DFOLaredo" target="_blank" rel="noopener">@DFOLaredo</a></p>`;
        return;
      }
      const avatar = user && user.avatar
        ? `<img class="x-post-avatar" src="${escapeHtml(user.avatar)}" alt="" width="40" height="40" loading="lazy" />`
        : `<div class="x-post-avatar" aria-hidden="true"></div>`;
      const name = escapeHtml((user && user.name) || "Laredo Field Office");
      const handle = escapeHtml((user && user.username) || "DFOLaredo");

      const cards = posts.map(function (p) {
        const img = p.images && p.images[0]
          ? `<img class="x-post-media" src="${escapeHtml(p.images[0].url)}" alt="" loading="lazy" />`
          : "";
        const when = formatPostTime(p.createdAt);
        return `<article class="x-post-card">
          <div class="x-post-who">
            ${avatar}
            <div><strong>${name}</strong><span>@${handle}</span></div>
          </div>
          <p class="x-post-text">${escapeHtml(p.text || "")}</p>
          ${img}
          <div class="x-post-meta">
            <span>${escapeHtml(when)}</span>
            <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">View on X</a>
          </div>
        </article>`;
      }).join("");

      host.innerHTML =
        `<div class="x-carousel-track" id="dfoTrack">${cards}</div>` +
        `<div class="x-carousel-nav">` +
        `<button type="button" class="x-nav-btn" id="dfoPrev" aria-label="Previous post">‹</button>` +
        `<button type="button" class="x-nav-btn" id="dfoNext" aria-label="Next post">›</button>` +
        `</div>`;

      const track = document.getElementById("dfoTrack");
      const step = function (dir) {
        if (!track) return;
        const card = track.querySelector(".x-post-card");
        const w = card ? card.getBoundingClientRect().width + 12 : 300;
        track.scrollBy({ left: dir * w, behavior: "smooth" });
      };
      const prev = document.getElementById("dfoPrev");
      const next = document.getElementById("dfoNext");
      if (prev) prev.onclick = function () { step(-1); };
      if (next) next.onclick = function () { step(1); };
    }

    /** Latest @DFOLaredo posts via Worker (X_BEARER_TOKEN stays on the server). */
    async function loadDfoTimeline() {
      const host = document.getElementById("dfoTimeline");
      if (!host || host.dataset.loaded === "1") return;
      host.dataset.loaded = "1";
      host.innerHTML = `<p class="x-timeline-fallback">${escapeHtml(t("xUpdatesLoading"))}</p>`;
      try {
        const res = await fetch(dfoPostsUrl() + "?t=" + Date.now(), {
          cache: "no-store",
          mode: "cors",
          credentials: "omit"
        });
        const data = await res.json();
        if (!res.ok || !data || data.ok === false) {
          throw new Error((data && data.error) || ("HTTP " + res.status));
        }
        renderDfoCarousel(data);
      } catch (_) {
        host.innerHTML =
          `<p class="x-timeline-fallback">${escapeHtml(t("xUpdatesFallback"))} ` +
          `<a href="https://x.com/DFOLaredo" target="_blank" rel="noopener">@DFOLaredo</a></p>`;
      }
    }

    function toggleTheme() {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    }

    function sharePageUrl() {
      try {
        const u = new URL(location.href);
        u.search = "";
        u.hash = "";
        return u.toString();
      } catch (_) {
        return location.href;
      }
    }

    function formatShareCell(wait, laneKind) {
      if (!wait) return null;
      if (isActiveWait(wait)) {
        let s = String(wait.minutes) + " min";
        if (wait.lanesOpenCount != null) {
          const kind = laneKind || "lane";
          s +=
            " (" +
            wait.lanesOpenCount +
            " " +
            kind +
            (wait.lanesOpenCount === 1 ? "" : "s") +
            " open)";
        }
        return s;
      }
      if (wait.pending) return "Pending";
      if (wait.closed) return "Closed";
      return null;
    }

    /** Open-lane breakdown for share text — one port-wide total. */
    function formatShareOpenBreakdown(summary, modeKey, port) {
      const key = modeKey === "trusted" ? "passenger" : modeKey;
      return tileOpenText(sectionByKey(port, key), key === "passenger" || key === "pedestrian").replace(/\n/g, " · ");
    }

    /** One share line: "Veh 45 min · 1 Gen · 3 Ready" (includes Ready wait when it differs). */
    function formatShareModeLine(label, summary, modeKey, port) {
      if (!summary || !summary.primary) return null;
      const readyActive = (summary.extras || []).find(
        (l) => /ready/i.test(l.name) && isShowableWait(l.wait)
      );
      const dualReady =
        readyActive &&
        isActiveWait(summary.primary) &&
        isActiveWait(readyActive.wait) &&
        summary.primary.minutes !== readyActive.wait.minutes;

      let head;
      if (dualReady) {
        head =
          label +
          " " + t("gen") + " " +
          summary.primary.minutes +
          " min / " + t("ready") + " " +
          readyActive.wait.minutes +
          " min";
      } else if (
        readyActive &&
        isActiveWait(summary.primary) &&
        isActiveWait(readyActive.wait) &&
        summary.primary.minutes === readyActive.wait.minutes
      ) {
        head = label + " " + combinedLaneLabel("ready") + " " + summary.primary.minutes + " min";
      } else {
        const cell = formatShareCell(summary.primary);
        if (!cell) return null;
        // Strip generic "(N lanes open)" — replaced by Gen/Ready breakdown below
        head = label + " " + cell.replace(/\s*\(\d+ lanes? open\)\s*$/i, "");
      }

      const openBits = formatShareOpenBreakdown(summary, modeKey, port);
      if (openBits) head += " · " + openBits;
      return head;
    }

    function laneWaitForShare(port, namePart) {
      const re = new RegExp(namePart, "i");
      for (const sec of port.sections || []) {
        for (const lane of sec.lanes || []) {
          if (re.test(lane.name) && !/ready/i.test(lane.name)) {
            return lane.wait;
          }
        }
      }
      return null;
    }

    function isLosIndiosPort(port) {
      const label = (port && (port.title || "")) + " " +
        (port && port.meta && port.meta.short ? port.meta.short : "");
      return /los\s*indios/i.test(label);
    }

    /** Email subject when the user picks Mail from the system share sheet. */
    function shareEmailSubject() {
      const asOf = document.querySelector(".asof-bar strong");
      let stamp = asOf && asOf.textContent ? asOf.textContent.trim() : "";
      if (!stamp || stamp === "—") {
        stamp = new Date().toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        });
      }
      return "BWT Report Time: " + stamp;
    }

    function sharePayload() {
      const url = sharePageUrl();
      const subject = shareEmailSubject();
      const lines = ["Brownsville wait times"];

      const asOf = document.querySelector(".asof-bar strong");
      if (asOf && asOf.textContent) {
        lines.push("Report time: " + asOf.textContent);
      }

      const data = lastData;
      const ports = data && data.items
        ? data.items.slice().sort(function (a, b) {
            const an = (a.meta && a.meta.short ? a.meta.short : a.title || "").toLowerCase();
            const bn = (b.meta && b.meta.short ? b.meta.short : b.title || "").toLowerCase();
            return an.localeCompare(bn);
          })
        : [];

      if (ports.length) {
        lines.push("");
        lines.push("Passenger");
        ports.forEach(function (port, idx) {
          if (idx > 0) lines.push("");
          const name = (port.meta && port.meta.short) || port.title || "-";
          // *name* renders bold in WhatsApp and many share targets
          lines.push("*" + name + "*");
          const veh = summarizeMode(port.sections, "passenger");
          const ped = summarizeMode(port.sections, "pedestrian");
          const parts = [];
          const vehText = formatShareModeLine("Veh", veh, "passenger", port);
          if (vehText) parts.push(vehText);
          // Los Indios has no pedestrian lanes reported — omit Ped entirely
          if (!isLosIndiosPort(port)) {
            const pedText = formatShareModeLine("Ped", ped, "pedestrian", port);
            if (pedText) parts.push(pedText);
          }
          if (isVeteransPort(port)) {
            const sentriText = formatShareCell(laneWaitForShare(port, "sentri"), "SENTRI");
            if (sentriText) parts.push("SENTRI " + sentriText);
          }
          lines.push(parts.length ? parts.join("\n") : "-");
        });

        const commercialPorts = ports.filter(isCommercialFastPort);
        if (commercialPorts.length) {
          lines.push("");
          lines.push("Commercial");
          commercialPorts.forEach(function (port, idx) {
            if (idx > 0) lines.push("");
            const name = (port.meta && port.meta.short) || port.title || "-";
            lines.push("*" + name + "*");
            const comm = summarizeMode(port.sections, "commercial");
            const parts = [];
            const commText = formatShareModeLine("Comm", comm, "commercial", port);
            if (commText) parts.push(commText);
            // FAST wait time (open count already in Comm breakdown when > 0)
            const fastWait = laneWaitForShare(port, "fast");
            if (fastWait && isShowableWait(fastWait)) {
              const fastText = formatShareCell(fastWait, "FAST");
              if (fastText) parts.push("FAST " + fastText);
            }
            lines.push(parts.length ? parts.join("\n") : "-");
          });
        }
      }

      const body = lines.join("\n").replace(/\n+$/, "");
      return {
        title: subject,
        subject: subject,
        text: body,
        url: url,
        fullText: body + "\n\n" + url
      };
    }

    function openShareMailto(payload) {
      // mailto: is the only reliable way to set the real email Subject field
      window.location.href =
        "mailto:?subject=" + encodeURIComponent(payload.subject) +
        "&body=" + encodeURIComponent(payload.fullText);
    }

    function isAppleMobileUa() {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    }

    async function shareTimes() {
      const payload = sharePayload();
      try {
        if (navigator.share) {
          if (isAppleMobileUa()) {
            // iOS Mail dumps share "title" into the message body instead of Subject.
            // Omit title for the share sheet (WhatsApp etc.); Mail users get a clean body.
            // Use mailto so Subject is set correctly when we fall through / for email-first.
            await navigator.share({ text: payload.fullText });
            return;
          }
          // Android / desktop: title becomes the email Subject when Mail/Gmail is chosen
          const data = { title: payload.subject, text: payload.fullText };
          if (navigator.canShare && !navigator.canShare(data)) {
            await navigator.share({ text: payload.fullText });
          } else {
            await navigator.share(data);
          }
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
      // No Web Share (or share failed): open the mail client with Subject + body
      try {
        openShareMailto(payload);
      } catch (_) {
        try {
          await navigator.clipboard.writeText(payload.fullText);
          const toast = document.getElementById("refreshToast");
          if (toast) {
            toast.textContent = t("toastCopied");
            toast.classList.remove("err");
            toast.classList.add("ok", "show");
            setTimeout(function () {
              toast.classList.remove("show", "ok");
              toast.textContent = "";
            }, 1800);
          }
        } catch (_) {
          window.prompt(payload.subject, payload.fullText);
        }
      }
    }

    function isStandaloneApp() {
      return window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true;
    }

    function isIosDevice() {
      const ua = navigator.userAgent || "";
      return /iphone|ipad|ipod/i.test(ua)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    function fillInstallHelp() {
      const list = document.getElementById("installHelpSteps");
      if (!list) return;
      const keys = isIosDevice()
        ? ["installIos1", "installIos2", "installIos3"]
        : ["installOther1", "installOther2", "installOther3"];
      list.innerHTML = keys.map(function (key) {
        return "<li>" + escapeHtml(t(key)) + "</li>";
      }).join("");
    }

    function showInstallHelp() {
      fillInstallHelp();
      const box = document.getElementById("installHelp");
      if (box) {
        box.hidden = false;
        box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function closeInstallHelp() {
      const box = document.getElementById("installHelp");
      if (box) box.hidden = true;
    }

    async function installApp() {
      if (isStandaloneApp()) {
        const btn = document.getElementById("installBtn");
        if (btn) btn.hidden = true;
        return;
      }
      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          const choice = await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
          if (choice && choice.outcome === "accepted") {
            const btn = document.getElementById("installBtn");
            if (btn) btn.hidden = true;
            closeInstallHelp();
            return;
          }
        } catch (_) {
          deferredInstallPrompt = null;
        }
      }
      showInstallHelp();
    }

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;
      if (location.protocol === "file:") return;
      navigator.serviceWorker.register(new URL("sw.js", location.href)).catch(function () { /* ignore */ });
    }

    function setupInstallButton() {
      const btn = document.getElementById("installBtn");
      if (!btn) return;
      btn.hidden = isStandaloneApp();
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      const btn = document.getElementById("installBtn");
      if (btn && !isStandaloneApp()) btn.hidden = false;
    });

    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      const btn = document.getElementById("installBtn");
      if (btn) btn.hidden = true;
      closeInstallHelp();
    });

    let chipEqualizeTimer = null;
    window.addEventListener("resize", function () {
      if (chipEqualizeTimer) clearTimeout(chipEqualizeTimer);
      chipEqualizeTimer = setTimeout(equalizeAllFilterChipHeights, 120);
    });

    applyTheme(currentTheme(), false);
    applyStaticLang();
    ensureCrowdSection();
    document.querySelectorAll("a.report-wait-link").forEach(function (link) {
      link.setAttribute("aria-controls", "crowdSource");
      link.addEventListener("click", openCrowdReport);
    });
    syncCrowdAria(document.getElementById("crowdSource"));
    if (location.hash === "#crowdSource") openCrowdFromHash();
    syncFilterUi();
    setupInstallButton();
    registerServiceWorker();
    setupLiveCams();
    loadDfoTimeline();
    loadData(true);
    requestUserGeo(false);
    const leaveCard = document.getElementById("leaveCard");
    if (leaveCard) {
      leaveCard.addEventListener("click", function () {
        if (leaveCard.classList.contains("is-action")) requestUserGeo(true);
      });
    }
    const geoOptIn = document.getElementById("geoOptIn");
    if (geoOptIn) {
      geoOptIn.addEventListener("click", function (event) {
        event.stopPropagation();
        requestUserGeo(true);
      });
    }
    window.addEventListener("storage", function (event) {
      if (!event || (event.key !== "bwt-geo-choice" && event.key !== "bwt-geo-cache")) return;
      if (geoInFlight) return;
      requestUserGeo(false);
    });
