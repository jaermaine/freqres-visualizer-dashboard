// Configuration options 
const toolType = "4620"
const toolPath = "iem/5128/"
// const Init_adjust = {"bass":8, "tilt":-0.8} // set to zeros to disable
// const defaultToBaseline = true;

// const redirect = true;
const pad = { l: 15, r: 15, t: 10, b: 36 };
const W0 = 800, W = W0 - pad.l - pad.r,
    H0 = 360, H = H0 - pad.t - pad.b;
const init_phones = ["Project Monolith S1", "JM-1 Target"], // Optional. Which graphs to display on initial load. Note: Share URLs will override this set
    DIR = "data/",                            // Directory where graph files are stored
    default_channels = ["L", "R"],                     // Which channels to display. Avoid javascript errors if loading just one channel per phone
    default_normalization = "dB",                     // Sets default graph normalization mode. Accepts "dB" or "Hz"
    default_norm_db = 60,                             // Sets default dB normalization point
    default_norm_hz = 800,                           // Sets default Hz normalization point
    max_channel_imbalance = 5,                        // ???
    scale_smoothing = 0.2,                            // Smoothing default value
    alt_layout = true,                                // Toggle between classic and alt layouts
    alt_sticky_graph = true,                      // If active graphs overflows the viewport, does the graph scroll with the page or stick
    alt_animated = true,                         // Determines if new graphs are drawn with a 1-second animation, or appear instantly
    alt_header = true,
    alt_header_new_tab = false,                    // Clicking alt_header links opens in new tab
    alt_tutorial = true,                         // Display a configurable frequency response guide below the graph
    alt_augment = true,                          // Display augment card in phone list, e.g. review sore, shop link
    site_url = 'https://hangout.audio',                          // Display a configurable header at the top of the alt layout
    share_url = true,                                 // If true, enables shareable URLs
    watermark_text = "graph.hangout.audio",           // Optional. Watermark appears behind graphs
    watermark_image_url = "../../hangout-logo-transparent.png",      // Optional. If image file is in same directory as config, can be just the filename
    page_title = "Crinacle's 5128 Graph Tool | Hangout.Audio",                    // Optional. Appended to the page title if share URLs are enabled
    page_description = "Compare graphs from the world's largest public database of ITU-T P.57 Type 4.3 IEM measurements, maintained by Crinacle.",
    restricted = false,                               // Enables restricted mode. More restricted options below.
    accessories = true,                               // If true, displays specified HTML at the bottom of the page. Configure further below
    externalLinksBar = true,                          // If true, displays row of pill-shaped links at the bottom of the page. Configure further below
    expandable = true,                               // Enables button to expand iframe over the top of the parent page
    expandableOnly = 767,                           // Prevents iframe interactions unless the user has expanded it. Accepts "true" or "false" OR a pixel value; if pixel value, that is used as the maximum width at which expandableOnly is used
    headerHeight = '0px',                             // Optional. If expandable=true, determines how much space to leave for the parent page header
    darkModeButton = false,                        // Adds a "Dark Mode" button the main toolbar to let users set preference
    targetDashed = true,                         // If true, makes target curves dashed lines
    targetColorCustom = false,                    // If false, targets appear as a random gray value. Can replace with a fixed color value to make all targets the specified color, e.g. "black"
    targetRestoreLastUsed = false,				// Restore user's last-used target settings on load
    labelsPosition = "bottom-right",                   // Up to four labels will be grouped in a specified corner. Accepts "top-left," bottom-left," "bottom-right," and "default"
    stickyLabels = true,                         // "Sticky" labels 
    analyticsEnabled = false,                     // Enables Google Analytics 4 measurement of site usage
    exportableGraphs = true,                      // Enables export graph button     
    extraEnabled = true,                          // Enable extra features
    extraUploadEnabled = true,                    // Enable upload function
    extraEQEnabled = true,                        // Enable parametic eq function
    extraEQBands = 10,                            // Default EQ bands available
    extraEQBandsMax = 20,                         // Max EQ bands available
    extraToneGeneratorEnabled = true;             // Enable tone generator function



// Specify which targets to display
const targets = [
    { type: "Diffuse Field", files: ["JM-1", "PopAvg-DF Hpcom", "Diffuse Field"] },
    { type: "Preference", files: ["IEF Preference 2025 (B&K 5128)", "Harman 2025 MoA Average", "Harman IE 2019 (B&K 5128)", "SoundGuys", "LMG 0.6"] },
];

const customTargetDispNames = {
    "JM-1": "PopAvg-DF (JM-1)",
    "PopAvg-DF Hpcom": "PopAvg-DF (Headphones.com)",
    "Diffuse Field": "5128-DF",
}

const preference_bounds_name = "Preference Bounds RAW",  // Preference bounds name
    preference_bounds_dir = "../../assets/pref_bounds/",  // Preference bounds directory
    preference_bounds_startup = false,              // If true, preference bounds are displayed on startup
    allowSquigDownload = false,                     // If true, allows download of measurement data
    PHONE_BOOK = "data/phone_book.json",                 // Path to phone book JSON file
    default_y_scale = "40db",                       // Default Y scale; values: ["20db", "30db", "40db", "50db", "crin"]
    default_DF_name = "JM-1",                   // Default RAW DF name
    dfBaseline = true,                              // If true, DF is used as baseline when custom df tilt is on
    default_bass_shelf = 0,                         // Default Custom DF bass shelf value
    default_tilt = -1,                            // Default Custom DF tilt value
    default_ear = 0,                                // Default Custom DF ear gain value
    default_treble = 0,                             // Default Custom DF treble gain value
    tiltableTargets = ["PopAvg-DF (JM-1)", "PopAvg-DF (Headphones.com)", "5128-DF"],                 // Targets that are allowed to be tilted
    compTargets = ["PopAvg-DF (JM-1)", "PopAvg-DF (Headphones.com)", "5128-DF"],                     // Targets that are allowed to be used for compensation
    allowCreatorSupport = false;                     // Allow the creator to have a button top right to support them


let extraEQplugins = [
    '../../plugins/devicePEQ/plugin.js', // Path to devicePEQ plugin
    '../../plugins/sharePEQ/plugin.js' // Path to sharePEQ plugin

];

// Let's have a place where plugins config can be loaded - optional
let pluginConfig = {
    advanced: true,    // Show the advanced connections here,
    devicePEQAnchorDiv: '.extra-upload',    // Allow more flexible placement of plugins
    devicePEQPlacement: 'beforebegin',
    sharePEQAnchorDiv: '.auto-eq-button',
    sharePEQPlacement: 'afterend'
}
window.DEVICEPEQ_CONFIG_BASE_URL = '/plugins/devicePEQ/';
// *************************************************************
// Functions to support config options set above; probably don't need to change these
// *************************************************************

// Set up the watermark, based on config options above
function watermark(svg) {
    let wm = svg.append("g")
        .attr("transform", "translate(" + (pad.l + W / 2) + "," + (pad.t + H / 2 - 20) + ")")


    if (watermark_image_url) {
        wm.append("image")
            .attrs({ x: -355, y: 60, width: 118, height: 118, "xlink:href": watermark_image_url })
            .attr("opacity", 0.22);
    }

    if (watermark_text) {
        wm.append("text")
            .attrs({ x: -230, y: 165, "font-size": 30, "text-anchor": "start", "font-family": "sans-serif", "class": "graph-name" })
            .attr("opacity", 0.26)
            .text(watermark_text);
    }

    let wms = svg.selectAll().data(d3.range(11)).join("g")
        .attr("transform", i => "translate(" + (pad.l + W * (i + 0.6) / 11) + "," + (pad.t + H - 50) + ")")
        .attr("opacity", 0.5);
    wms.filter(i => i === 9).append("text")
        .attrs({ x: 0, y: -265, "font-size": 16, "text-anchor": "end", "font-family": "sans-serif", "class": "logo-title" })
        .selectAll().data(["Measurements generated on:", "B&K Type 5128 (4620)", "ITU-T P.57 Type 4.3"])
        .join("tspan").attrs({ x: 5, dy: 18 }).text(d => d);
    wms.filter(i => i === 10).append("image")
        .attrs({ x: -45, y: -260, width: 60, height: 60, "xlink:href": "../../BK-logo.png" });
}

// Parse fr text data from REW or AudioTool format with whatever separator
function tsvParse(fr) {
    return fr.split(/[\r\n]/)
        .map(l => l.trim()).filter(l => l && l[0] !== '*')
        .map(l => l.split(/[\s,;]+/).map(e => parseFloat(e)).slice(0, 2))
        .filter(t => !isNaN(t[0]) && !isNaN(t[1]));
}

// Apply stylesheet based layout options above
function setLayout() {
    function applyStylesheet(styleSheet) {
        var docHead = document.querySelector("head"),
            linkTag = document.createElement("link");

        linkTag.setAttribute("rel", "stylesheet");
        linkTag.setAttribute("type", "text/css");

        linkTag.setAttribute("href", styleSheet);
        docHead.append(linkTag);
    }

    if (!alt_layout) {
        applyStylesheet("../../style.css");
    } else {
        applyStylesheet("../../style-alt.css");
        applyStylesheet("../../style-alt-theme.css");
    }
}
setLayout();



// Configure HTML accessories to appear at the bottom of the page. Displayed only if accessories (above) is true
// There are a few templates here for ease of use / examples, but these variables accept any HTML
const
    // Short text, center-aligned, useful for a little side info, credits, links to measurement setup, etc. 
    simpleAbout = `
        <p class="center">This graph database is maintained by In-Ear Fidelity with frequency responses generated using an ITU-T P.57 Type 4.3-compliant ear simulator. This web software is based on the <a href="https://github.com/mlochbaum/CrinGraph">CrinGraph</a> open-source software project by Marshall Lochbaum.</p>
    `,
    // Slightly different presentation to make more readable paragraphs. Useful for elaborated methodology, etc.
    paragraphs = `
        <h2>Viverra tellus in hac</h2>
        <p>Lorem ipsum dolor sit amet, <a href="">consectetur adipiscing elit</a>, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quisque non tellus orci ac. Dictumst quisque sagittis purus sit amet volutpat consequat. Vitae nunc sed velit dignissim sodales ut. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Dignissim enim sit amet venenatis urna cursus eget nunc. Mi proin sed libero enim. Ut sem viverra aliquet eget sit amet. Integer enim neque volutpat ac tincidunt vitae. Tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Lacus luctus accumsan tortor posuere ac ut consequat semper. Non pulvinar neque laoreet suspendisse interdum consectetur libero id faucibus. Aliquam sem et tortor consequat id. Cursus sit amet dictum sit amet justo donec. Donec adipiscing tristique risus nec feugiat in fermentum posuere.</p>
        <p>Diam donec adipiscing tristique risus nec. Amet nisl purus in mollis. Et malesuada fames ac turpis egestas maecenas pharetra. Ante metus dictum at tempor commodo ullamcorper a. Dui id ornare arcu odio ut sem nulla. Ut pharetra sit amet aliquam id diam maecenas. Scelerisque in dictum non consectetur a erat nam at. In ante metus dictum at tempor. Eget nulla facilisi etiam dignissim diam quis enim lobortis scelerisque. Euismod nisi porta lorem mollis aliquam ut porttitor leo a. Malesuada proin libero nunc consequat interdum. Turpis egestas sed tempus urna et pharetra pharetra massa massa. Quis blandit turpis cursus in hac habitasse. Amet commodo nulla facilisi nullam vehicula ipsum a.</p>
        <p>Mauris ultrices eros in cursus turpis massa tincidunt. Aliquam ut porttitor leo a diam sollicitudin. Curabitur vitae nunc sed velit. Cursus metus aliquam eleifend mi in nulla posuere sollicitudin. Lectus nulla at volutpat diam ut. Nibh nisl condimentum id venenatis a condimentum vitae sapien. Tincidunt id aliquet risus feugiat in ante metus. Elementum nibh tellus molestie nunc non blandit massa enim. Ac tortor vitae purus faucibus ornare suspendisse. Pellentesque sit amet porttitor eget. Commodo quis imperdiet massa tincidunt. Nunc sed id semper risus in hendrerit gravida. Proin nibh nisl condimentum id venenatis a condimentum. Tortor at risus viverra adipiscing at in. Pharetra massa massa ultricies mi quis hendrerit dolor. Tempor id eu nisl nunc mi ipsum faucibus vitae.</p>
        <h2>Tellus orci</h2>
        <p>Viverra mauris in aliquam sem. Viverra tellus in hac habitasse platea. Facilisi nullam vehicula ipsum a arcu cursus. Nunc sed augue lacus viverra vitae congue eu. Pretium fusce id velit ut tortor pretium viverra suspendisse. Eu scelerisque felis imperdiet proin. Tincidunt arcu non sodales neque sodales ut etiam sit amet. Tellus at urna condimentum mattis pellentesque. Congue nisi vitae suscipit tellus. Ut morbi tincidunt augue interdum.</p>
        <p>Scelerisque in dictum non consectetur a. Elit pellentesque habitant morbi tristique senectus et. Nulla aliquet enim tortor at auctor urna nunc id. In ornare quam viverra orci. Auctor eu augue ut lectus arcu bibendum at varius vel. In cursus turpis massa tincidunt dui ut ornare lectus. Accumsan in nisl nisi scelerisque eu ultrices vitae auctor eu. A diam sollicitudin tempor id. Tellus mauris a diam maecenas sed enim ut sem. Pellentesque id nibh tortor id aliquet lectus proin. Fermentum et sollicitudin ac orci phasellus. Dolor morbi non arcu risus quis. Bibendum enim facilisis gravida neque. Tellus in metus vulputate eu scelerisque felis. Integer malesuada nunc vel risus commodo. Lacus laoreet non curabitur gravida arcu.</p>
    `,
    // Customize the count of widget divs, and customize the contents of them. As long as they're wrapped in the widget div, they should auto-wrap and maintain margins between themselves
    widgets = `
        <div class="accessories-widgets">
            <div class="widget">
                <img width="200" src="cringraph-logo.svg"/>
            </div>
            <div class="widget">
                <img width="200" src="cringraph-logo.svg"/>
            </div>
            <div class="widget">
                <img width="200" src="cringraph-logo.svg"/>
            </div>
        </div>
    `,
    // Which of the above variables to actually insert into the page
    whichAccessoriesToUse = simpleAbout;



// Configure external links to appear at the bottom of the page. Displayed only if externalLinksBar (above) is true
const linkSets = [
    {
        label: "CrinGraph Contributors:",
        links: [
            {
                name: "Super* Review (Squig.link)",
                url: "https://squig.link/"
            },
            {
                name: "HarutoHiroki (Target features)",
                url: "https://graphtool.harutohiroki.com/"
            },
            {
                name: "Rohsa (AutoEQ integration)",
                url: "https://rohsa.gitlab.io/graphtool/"
            },
            {
                name: "Banbeucmas (Assistance)",
                url: "https://banbeu.com/graph/tool/"
            },
        ]
    },
];




// Set up analytics
function setupGraphAnalytics() {
    if (analyticsEnabled) {
        const pageHead = document.querySelector("head"),
            graphAnalytics = document.createElement("script"),
            graphAnalyticsSrc = "graphAnalytics.js";

        graphAnalytics.setAttribute("src", graphAnalyticsSrc);
        pageHead.append(graphAnalytics);
    }
}
setupGraphAnalytics();



// If alt_header is enabled, these are the items added to the header

let headerLogoText = '',
    headerLogoImgUrl = "/hangout-logo-white-text.svg",
    headerLinks = [
        {
            name: "The List",
            url: "https://list.hangout.audio/iem"
        },
        {
            name: "IEMs (B&K Type 5128)",
            url: "https://graph.hangout.audio/iem/5128"
        },
        {
            name: "IEMs (711)",
            url: "https://graph.hangout.audio/iem/711"
        },
        {
            name: "Headphones (GRAS 43AG-7)",
            url: "https://graph.hangout.audio/headphones"
        },
        {
            name: "EQ Tool",
            url: "https://eq.hangout.audio"
        },
        {
            name: "+Create Squiglink",
            url: "../create/"
        }
    ];


let tutorialDefinitions = [
    {
        name: 'Sub bass',
        width: '20.1%',
        description: 'Rumble, growl, etc.'
    },
    {
        name: 'Mid bass',
        width: '19.2%',
        description: 'Punch, impact, beats, etc.'
    },
    {
        name: 'Lower midrange',
        width: '17.4%',
        description: 'Affects note weight and richness. Too much results in muddiness, while too little makes instruments sound anemic and thin.'
    },
    {
        name: 'Upper midrange',
        width: "26%",
        description: 'Mainly affects harmonics. Too much results in a shouty and overly-forward presentation, too little makes things dull and lifeless.'
    },
    {
        name: 'Treble',
        width: '7.3%',
        description: 'Sparkle, sharpness, sibilance, etc. More treble makes thing sound bright, less treble makes things sound dark.'
    },
    {
        name: 'Air',
        width: '10%',
        description: 'Mainly affects upper harmonics and can also be the cause of sibilance depending on magnitude.'
    }
] 