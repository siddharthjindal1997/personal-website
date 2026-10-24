// Everything the room says. Edit words here; the 3D code never hardcodes copy.

export const ME = {
  name: 'Siddharth Jindal',
  line: 'Engineer who paints. Tech lead, maps.gov.sg.',
};

// label + conf is what the "camera" detects; the rest shows when you look closer.
export const ITEMS = {
  guitar: {
    label: 'guitar', conf: 0.94,
    title: 'Yamaha F310',
    body: [
      'Intermediate. Bonfire-grade, by my own rating: four chords and the confidence to use them.',
      'On repeat: Arctic Monkeys, Hozier, Coldplay, and lately Sudan, a Mumbai artist I keep pushing on everyone.',
    ],
    hint: 'Brush across the strings. Tap the body to strum.',
  },
  easel: {
    label: 'painting', conf: 0.61,
    title: 'Half-finished, as usual',
    body: [
      'I paint and sketch whenever there is time. At IIT Kharagpur I ran the art society as its governor, and acted in three stage plays.',
      'The bare half is what a computer sees first: edges. I spent years teaching machines to see. That half is still waiting for a person.',
    ],
    hint: 'Drag across the canvas to finish it.',
  },
  laptop: {
    label: 'laptop', conf: 0.97,
    title: 'Currently: maps.gov.sg',
    body: [
      'Tech lead at Open Government Products in Singapore. maps.gov.sg lets public officers share places with the public, and run their geospatial work in one tool.',
      'Before that, five years at Microsoft, mostly Bing Travel: car and flight search for 500K+ people a day, an AI trip planner for Copilot, and the distributed plumbing underneath.',
      'On weekends: an AI clinic assistant for small-town doctors, a family health tracker, and a bot that watches flight prices against my calendar.',
    ],
    links: [
      { text: 'maps.gov.sg', href: 'https://maps.gov.sg' },
      { text: 'open.gov.sg', href: 'https://www.open.gov.sg' },
    ],
  },
  hoodie: {
    label: 'hoodie', conf: 0.91,
    title: 'Placecom, IIT Kharagpur',
    body: [
      '2015 to 2020, RP Hall. Mathematics and Computing, the five-year integrated degree.',
      'In pre-final year I was on the placement team, running campus hiring for 1,500 of my batchmates.',
      'In the VR lab, a 3D-designer friend and I built Virtual KGP: a digital twin of the campus with a game inside it. It made the campus paper.',
    ],
    hint: 'Tap it to turn it around.',
  },
  window: {
    label: 'singapore', conf: 0.83,
    title: 'Now: Singapore',
    body: [
      'A year ago I left Microsoft, moved countries, and joined Open Government Products to build for the public good.',
      'Most recently: CareKampung, a caregiving app I built as the only developer at Hack for Public Good 2026.',
    ],
    links: [
      { text: 'How OGP builds (TED)', href: 'https://www.youtube.com/watch?v=dxaxVUcJuAY' },
      { text: 'CareKampung', href: 'https://www.hack.gov.sg/2026/carekampung/' },
    ],
  },
  notes: {
    label: 'todo', conf: 0.72,
    title: 'Still learning',
    body: [
      'Post-training, fine-tuning, distillation. Building an agent and a RAG system that actually hold up.',
      'How to sell. I know how to build things; I want to learn how to get them to people.',
      'Investing. I followed Runway, 20VC and 1littlecoder before they had 10k followers. Spotting things early is the part I already have.',
    ],
  },
  tv: { label: 'tv', conf: 0.98, tv: true },
  gigs: { label: 'door', conf: 0.99, door: true },
  places: { label: 'door', conf: 0.99, door: true },
};

// On the TV in the sofa corner, played in this order. Each note floats beside the screen.
// Add a show by adding an entry; `art` picks the scene the TV paints (tv.js#ART), and
// `feels` are what the episode brings up, scored like the room's detections.
export const SHOWS = [
  {
    name: 'BoJack Horseman',
    episodes: [
      {
        se: 'S3 · E4', title: 'Fish Out of Water', art: 'underwater',
        feels: [['being the foreigner', 0.94], ['quiet', 0.9]],
        body: [
          'Twenty minutes with almost no words. BoJack is underwater in a city whose language he cannot speak, trying to do one kind thing and fumbling it.',
          'It lands differently since I moved countries. The best moments in a new place, and the loneliest ones, both happen without words.',
        ],
      },
      {
        se: 'S4 · E11', title: 'Time\'s Arrow', art: 'memory',
        feels: [['memory', 0.92], ['where hurt comes from', 0.89]],
        body: [
          'Told from inside his mother\'s dementia: faces scribbled out, rooms rearranging, a whole life folding into its worst afternoons.',
          'It does not excuse anyone. It shows that the people who hurt us were usually handed the hurt first.',
        ],
      },
      {
        se: 'S5 · E6', title: 'Free Churro', art: 'eulogy',
        feels: [['things left unsaid', 0.96], ['grief', 0.91]],
        body: [
          'One horse, one lectern, one long monologue at his mother\'s funeral, for a person he never really got to know.',
          'A whole episode about the conversation you meant to have and now cannot. It is why I try to say the thing now, not later.',
        ],
      },
      {
        se: 'S6 · E15', title: 'The View from Halfway Down', art: 'dinner',
        feels: [['the people we lose', 0.95], ['regret', 0.9]],
        body: [
          'A dinner party where everyone at the table is already gone. One by one they take the stage for him, while the door at the end of the hall gets closer.',
          'It is about how clear everything looks once it is too late to act on it. I think of it whenever I am putting something off.',
        ],
      },
      {
        se: 'S6 · E16', title: 'Nice While It Lasted', art: 'rooftop',
        feels: [['people who were there for a while', 0.97], ['letting go', 0.9]],
        body: [
          'BoJack and Diane on a rooftop at a wedding, talking like two old friends who both know this is the last time. "Mr. Blue" plays underneath.',
          'Some people are in your life for a chapter, not the whole book, and that is allowed. I think of every city and team I have left, and how much of them I still carry.',
        ],
      },
    ],
  },
];

// Lying on the rug. Swap `motif` for a real photo later (see README).
export const POLAROIDS = [
  {
    id: 'jee', motif: 'omr', caption: 'JEE, 2015',
    title: 'JEE, 2015',
    body: ['Rank 1,500 among the 1.5 lakh students who qualified. The ticket to Kharagpur.'],
  },
  {
    id: 'vkgp', motif: 'wire', caption: 'Virtual KGP',
    title: 'Virtual KGP',
    body: ['A digital twin of IIT Kharagpur, built in the campus VR lab with a 3D-designer friend, with a game inside it.'],
  },
  {
    id: 'gsoc', motif: 'wave', caption: 'GSoC',
    title: 'Google Summer of Code',
    body: [
      'One of about 1,300 students worldwide. With CCExtractor and @Zulko I built a tool that finds the exciting moments in a video.',
      'Track corners, measure motion with optical flow, catch hard cuts, find peaks in crowd noise, smooth it all out.',
    ],
  },
  {
    id: 'imaginate', motif: 'flow', caption: 'Imaginate, HYD',
    title: 'Imaginate Labs, Hyderabad',
    body: ['Third-year internship as a VR and computer vision engineer: optical flow, and annotations pinned into live streams inside VR and AR headsets. It is why this room draws boxes around things.'],
  },
  {
    id: 'ms', motif: 'doc', caption: 'Morgan Stanley',
    title: 'Morgan Stanley, Mumbai',
    body: ['Fourth-year internship teaching a computer to read scanned documents: deskew the page, find tables with Hough lines, split the layout, and decide whether a checkbox is ticked with a fine-tuned VGG16.'],
  },
  {
    id: 'care', motif: 'kampung', caption: 'CareKampung',
    title: 'CareKampung, 2026',
    body: ['A caregiving app for Hack for Public Good 2026. I was the only developer.'],
    links: [{ text: 'hack.gov.sg', href: 'https://www.hack.gov.sg/2026/carekampung/' }],
  },
];

export const GIGS = {
  title: 'Gigs',
  kicker: 'outside · crowd 0.98',
  body: [
    'Prateek Kuhad and Arijit Singh, live, in a sea of phone torches.',
    'And Sofar Sounds: secret gigs where you only learn the address the day before, then sit on the floor of a stranger\'s living room.',
    'Current obsession: Sudan.',
  ],
  screen: [
    ['Prateek Kuhad', 'live'],
    ['Arijit Singh', 'live'],
    ['Sofar Sounds', 'secret location'],
  ],
};

export const PLACES = {
  title: 'Places',
  kicker: 'outside · map 0.97',
  body: ['Cities that shaped me, in order. The paper plane knows the route.'],
  stops: [
    { name: 'Kharagpur', years: '2015–20', landmark: 'kgp' },
    { name: 'Hyderabad', years: '2018', landmark: 'charminar' },
    { name: 'Mumbai', years: '2019', landmark: 'gateway' },
    { name: 'Singapore', years: 'now', landmark: 'mbs' },
  ],
};
