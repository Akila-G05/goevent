/**
 * Sample discovery data shared by the home page cards and the single-event page.
 *
 * The backend has no event endpoints yet (`EventController` is still empty), so
 * every card links to a detail record generated from the same seed. When the API
 * lands, replace the exported constants and `getSampleEvent` with query helpers;
 * the `EventDetail` shape can stay as the view model.
 */

export type ConcertCategory = 'All' | 'Today' | 'This Weekend' | 'This Month' | 'Festival';
export type EventKind = 'music' | 'tech';

export interface ConcertCard {
  id: string;
  slug: string;
  title: string;
  artistSubtitle: string;
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  city: string;
  venue: string;
  imageUrl: string;
  category: ConcertCategory;
  price: number;
}

export interface TourEvent {
  id: string;
  slug: string;
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  city: string;
  tourSubtitle: string;
  tag: string;
  region: 'Asia' | 'International';
  price: number;
}

export interface UpcomingConcert {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  tags: string[];
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  badgeOverlay: string;
  imageUrl: string;
  price: number;
}

export interface EventHighlight {
  icon: 'terminal' | 'brain' | 'briefcase' | 'music' | 'shield' | 'ticket' | 'users' | 'sparkles';
  title: string;
  body: string;
}

export interface EventSession {
  id: string;
  time: string;
  stage: string;
  duration: string;
  title: string;
  speaker: string;
}

export interface EventDay {
  id: string;
  label: string;
  title: string;
  hours: string;
  sessions: EventSession[];
}

export interface EventSpeaker {
  id: string;
  name: string;
  role: string;
  org: string;
  image: string;
  badge?: string;
}

export interface EventTicketTier {
  id: string;
  name: string;
  badge?: string;
  description: string;
  price: number;
  compareAt?: number;
  note: string;
  maxPerOrder: number;
  remaining: number;
}

export interface EventHost {
  name: string;
  tagline: string;
  rating: number;
  followers: string;
  pastEvents: number;
  initials: string;
}

export interface VenuePerk {
  icon: 'shuttle' | 'parking' | 'accessible';
  label: string;
}

export interface EventVenue {
  name: string;
  address: string;
  city: string;
  entrance: string;
  shuttle: string;
  perks: VenuePerk[];
  mapQuery: string;
}

export interface EventTagGroups {
  topic: string[];
  format: string[];
  audience: string[];
}

export interface EventDetail {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  kind: EventKind;
  status: 'Selling Fast' | 'On Sale' | 'Few Left';
  verified: boolean;
  format: string;
  dateLine: string;
  dateRange: string;
  timezone: string;
  locationLine: string;
  heroImage: string;
  cardImage: string;
  priceFrom: number;
  priceTo: number;
  host: EventHost;
  about: string[];
  highlights: EventHighlight[];
  tags: EventTagGroups;
  days: EventDay[];
  speakers: EventSpeaker[];
  venue: EventVenue;
  tickets: EventTicketTier[];
  requirements: string;
  studentDiscount?: string;
  related: string[];
}

const PORTRAITS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
];

export const FLAGSHIP_EVENT_SLUG = 'global-ai-cybersecurity-summit-2025';

/* -------------------------------------------------------------------------- */
/* Home page cards                                                             */
/* -------------------------------------------------------------------------- */

export const browsingConcerts: ConcertCard[] = [
  {
    id: 'c1',
    slug: 'yoabiso',
    title: 'YOABISO',
    artistSubtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
    dayOfWeek: 'SUN',
    dayNumber: '18',
    monthYear: 'APR 24',
    city: 'Surabaya',
    venue: 'Lapangan Merr',
    imageUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    category: 'All',
    price: 65,
  },
  {
    id: 'c2',
    slug: 'andi-odang',
    title: 'ANDI ODANG',
    artistSubtitle: 'Pestapora Festival',
    dayOfWeek: 'SUN',
    dayNumber: '2',
    monthYear: 'APR 24',
    city: 'Surabaya',
    venue: 'Tunjungan Plaza',
    imageUrl:
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=800&q=80',
    category: 'Festival',
    price: 85,
  },
  {
    id: 'c3',
    slug: 'sound-of-heracles',
    title: 'SOUND OF HERACLES',
    artistSubtitle: 'Metal Death Festival',
    dayOfWeek: 'SUN',
    dayNumber: '11',
    monthYear: 'APR 24',
    city: 'Surabaya',
    venue: 'Gedung Gedangan',
    imageUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    category: 'This Weekend',
    price: 50,
  },
  {
    id: 'c4',
    slug: 'the-yellow-wall',
    title: 'THE YELLOW WALL',
    artistSubtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
    dayOfWeek: 'SUN',
    dayNumber: '18',
    monthYear: 'APR 24',
    city: 'Surabaya',
    venue: 'Lapangan Merr',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    category: 'This Month',
    price: 70,
  },
  {
    id: 'c5',
    slug: 'sir-paul-shaddy',
    title: 'SIR PAUL SHADDY',
    artistSubtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
    dayOfWeek: 'SUN',
    dayNumber: '31',
    monthYear: 'MAY 24',
    city: 'Surabaya',
    venue: 'Lapangan Merr',
    imageUrl:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    category: 'All',
    price: 95,
  },
];

export const tourEvents: TourEvent[] = [
  {
    id: 't1',
    slug: 'le-pharaohs-bangkok',
    dayOfWeek: 'SUN',
    dayNumber: '27',
    monthYear: 'APR 24',
    city: 'BANGKOK',
    tourSubtitle: 'Comeback Again Nailong 24 City All The World',
    tag: 'Le Pharaohs',
    region: 'Asia',
    price: 110,
  },
  {
    id: 't2',
    slug: 'le-pharaohs-jakarta',
    dayOfWeek: 'SAT',
    dayNumber: '16',
    monthYear: 'MEI 24',
    city: 'JAKARTA',
    tourSubtitle: 'Comeback Again Nailong 24 City All The World',
    tag: 'Le Pharaohs',
    region: 'Asia',
    price: 95,
  },
  {
    id: 't3',
    slug: 'le-pharaohs-surabaya',
    dayOfWeek: 'FRI',
    dayNumber: '12',
    monthYear: 'JUN 24',
    city: 'SURABAYA',
    tourSubtitle: 'Comeback Again Nailong 24 City All The World',
    tag: 'Le Pharaohs',
    region: 'Asia',
    price: 85,
  },
  {
    id: 't4',
    slug: 'le-pharaohs-bali',
    dayOfWeek: 'SAT',
    dayNumber: '4',
    monthYear: 'JUL 24',
    city: 'BALI',
    tourSubtitle: 'Comeback Again Nailong 24 City All The World',
    tag: 'Le Pharaohs',
    region: 'Asia',
    price: 125,
  },
  {
    id: 't5',
    slug: 'le-pharaohs-kuala-lumpur',
    dayOfWeek: 'SAT',
    dayNumber: '24',
    monthYear: 'APR 24',
    city: 'KUALA LUMPUR',
    tourSubtitle: 'Comeback Again Nailong 24 City All The World',
    tag: 'Le Pharaohs',
    region: 'Asia',
    price: 105,
  },
  {
    id: 't6',
    slug: 'le-pharaohs-tokyo',
    dayOfWeek: 'THU',
    dayNumber: '15',
    monthYear: 'AUG 24',
    city: 'TOKYO',
    tourSubtitle: 'World Tour Stadium Special - Tokyo Dome',
    tag: 'Le Pharaohs',
    region: 'International',
    price: 160,
  },
  {
    id: 't7',
    slug: 'le-pharaohs-seoul',
    dayOfWeek: 'SAT',
    dayNumber: '28',
    monthYear: 'SEP 24',
    city: 'SEOUL',
    tourSubtitle: 'Olympic Gymnastics Arena Live Experience',
    tag: 'Le Pharaohs',
    region: 'International',
    price: 150,
  },
];

export const upcomingConcerts: UpcomingConcert[] = [
  {
    id: 'u1',
    slug: 'sir-paul-shaddy-solo',
    title: 'SIR PAUL SHADDY',
    subtitle: 'Sir Paul Shaddy - delivered by Tokopedia',
    tags: ['Surabaya', 'Lapangan Merr'],
    dayOfWeek: 'SUN',
    dayNumber: '18',
    monthYear: 'APR 24',
    badgeOverlay: 'SIR PAUL SHADDY SOLO',
    imageUrl:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80',
    price: 90,
  },
  {
    id: 'u2',
    slug: 'bring-me-the-star-track',
    title: 'BRING ME THE STAR TRACK',
    subtitle: 'Jakarta Tour 2024 - delivered by Ngojek',
    tags: ['Jakarta', 'Indonesia Arena'],
    dayOfWeek: 'SAT',
    dayNumber: '16',
    monthYear: 'MAY 24',
    badgeOverlay: 'BRING ME THE STAR TRACK Jakarta Tour 2024',
    imageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    price: 120,
  },
  {
    id: 'u3',
    slug: '4gvs',
    title: '4GVS',
    subtitle: 'This is 4GVS - delivered by JLANT',
    tags: ['Malang', 'Rampal'],
    dayOfWeek: 'SUN',
    dayNumber: '18',
    monthYear: 'APR 24',
    badgeOverlay: 'THIS IS 4GVS',
    imageUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    price: 75,
  },
  {
    id: 'u4',
    slug: 'nailong',
    title: 'NAILONG',
    subtitle: 'Comeback Again Nailong 24 City All The World',
    tags: ['Bojonegoro', 'GOR DABONSIA'],
    dayOfWeek: 'SAT',
    dayNumber: '16',
    monthYear: 'APR 24',
    badgeOverlay: 'COMEBACK AGAIN NAILONG 24 CITY ALL THE WORLD',
    imageUrl:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    price: 80,
  },
];

/* -------------------------------------------------------------------------- */
/* Detail builders                                                             */
/* -------------------------------------------------------------------------- */

interface DetailSeed {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  kind: EventKind;
  dayOfWeek: string;
  dayNumber: string;
  monthYear: string;
  city: string;
  venue: string;
  price: number;
  imageUrl: string;
}

const GENERATED_HOST: EventHost = {
  name: 'GoEvent Live',
  tagline: 'Verified organiser · Live music & touring',
  rating: 4.9,
  followers: '8.6k',
  pastEvents: 42,
  initials: 'GL',
};

function musicHighlights(seed: DetailSeed): EventHighlight[] {
  return [
    {
      icon: 'music',
      title: 'Full arena production',
      body: 'Concert-grade sound, lighting and staging built for a full-capacity crowd.',
    },
    {
      icon: 'shield',
      title: 'Verified QR entry',
      body: 'Every pass is issued by GoEvent and scanned once at the gate.',
    },
    {
      icon: 'users',
      title: 'Food & merch village',
      body: 'Local vendors, official merchandise and a chill-out zone before the headline set.',
    },
    {
      icon: 'ticket',
      title: '48h flexible refunds',
      body: 'Cancel up to 48 hours before doors open and get the full amount back.',
    },
  ];
}

function musicTags(seed: DetailSeed): EventTagGroups {
  return {
    topic: ['Live Music', 'Festival', 'Nightlife', 'Concert'],
    format: ['Concert', 'Festival'],
    audience: ['Public', 'University Students'],
  };
}

function buildMusicDetail(seed: DetailSeed): EventDetail {
  const dayId = `${seed.slug}-day-1`;

  return {
    slug: seed.slug,
    title: seed.title,
    subtitle: seed.subtitle,
    category: seed.category,
    kind: 'music',
    status: 'On Sale',
    verified: true,
    format: `${seed.city} Stage · 1 Day`,
    dateLine: `${seed.dayNumber} ${seed.monthYear}`,
    dateRange: `${seed.dayOfWeek} ${seed.dayNumber} ${seed.monthYear} · Doors 6:00 PM`,
    timezone: 'WIB (UTC+7)',
    locationLine: `${seed.venue}, ${seed.city}`,
    heroImage: seed.imageUrl,
    cardImage: seed.imageUrl,
    priceFrom: seed.price,
    priceTo: seed.price + 55,
    host: GENERATED_HOST,
    about: [
      `${seed.title} takes over ${seed.venue}, ${seed.city} with ${seed.subtitle}. Expect a full concert production, verified entry and instant QR passes delivered to your phone the moment you check out.`,
      `Doors open 60 minutes before the show. Bring a photo ID that matches the ticket holder, keep your QR pass handy at the gate, and arrive early to explore the food and merchandise village before the headline set.`,
    ],
    highlights: musicHighlights(seed),
    tags: musicTags(seed),
    days: [
      {
        id: dayId,
        label: 'Day 1',
        title: 'Main Show & Afterparty',
        hours: '06:00 PM - 11:30 PM WIB',
        sessions: [
          {
            id: `${dayId}-1`,
            time: '06:00 PM',
            stage: 'Main Gate',
            duration: '60 Mins',
            title: 'Doors open & welcome set',
            speaker: 'GoEvent Live crew',
          },
          {
            id: `${dayId}-2`,
            time: '07:30 PM',
            stage: 'Main Stage',
            duration: '90 Mins',
            title: `${seed.title} live in concert`,
            speaker: seed.subtitle,
          },
          {
            id: `${dayId}-3`,
            time: '09:30 PM',
            stage: 'Afterhours Tent',
            duration: '120 Mins',
            title: 'DJ afterparty',
            speaker: 'Resident DJ · GoEvent Live',
          },
        ],
      },
    ],
    speakers: [
      {
        id: `${seed.slug}-s1`,
        name: seed.title,
        role: 'Headline Performer',
        org: seed.subtitle,
        image: PORTRAITS[0],
        badge: 'HEADLINER',
      },
      {
        id: `${seed.slug}-s2`,
        name: 'The Midnight Echoes',
        role: 'Supporting Act',
        org: seed.city,
        image: PORTRAITS[1],
      },
      {
        id: `${seed.slug}-s3`,
        name: 'DJ Kaldera',
        role: 'Afterparty',
        org: 'GoEvent Live',
        image: PORTRAITS[2],
      },
      {
        id: `${seed.slug}-s4`,
        name: 'Aria Lune',
        role: 'Opening Set',
        org: seed.city,
        image: PORTRAITS[3],
      },
    ],
    venue: {
      name: seed.venue,
      address: `${seed.venue}, ${seed.city}`,
      city: seed.city,
      entrance: 'Main Gate · North Entrance',
      shuttle: 'Free shuttle from the city centre every 20 minutes.',
      perks: [
        { icon: 'shuttle', label: 'Free city shuttle' },
        { icon: 'parking', label: '1,200+ secure parking bays' },
        { icon: 'accessible', label: 'Wheelchair accessible venue' },
      ],
      mapQuery: `${seed.venue}, ${seed.city}`,
    },
    tickets: [
      {
        id: `${seed.slug}-early`,
        name: 'Early Bird',
        badge: 'Limited',
        description: 'Entry for one · first release allocation.',
        price: seed.price,
        compareAt: seed.price + 10,
        note: 'per person',
        maxPerOrder: 4,
        remaining: 120,
      },
      {
        id: `${seed.slug}-general`,
        name: 'General Admission',
        badge: 'Standard',
        description: 'Standing access to the full show and afterparty.',
        price: seed.price + 20,
        note: 'per person',
        maxPerOrder: 6,
        remaining: 480,
      },
      {
        id: `${seed.slug}-vip`,
        name: 'VIP & Fast Lane',
        badge: 'VIP',
        description: 'Front-zone access, fast lane entry and a merch pack.',
        price: seed.price + 55,
        note: 'all inclusive',
        maxPerOrder: 4,
        remaining: 60,
      },
    ],
    requirements:
      'Please present a valid photo ID matching the ticket holder alongside your digital QR pass at the gate. Doors open 60 minutes before the show; re-entry is not permitted once you leave the venue.',
    related: [],
  };
}

const FLAGSHIP: EventDetail = {
  slug: FLAGSHIP_EVENT_SLUG,
  title: 'GLOBAL AI & CYBERSECURITY SUMMIT 2025',
  subtitle:
    'Next-Gen Architecture, Autonomous Defense Systems, & The Sound of Future Tech Keynotes.',
  category: 'Conference & Expo',
  kind: 'tech',
  status: 'Selling Fast',
  verified: true,
  format: 'Surabaya Stage · 3 Days',
  dateLine: 'Oct 18-20, 2024',
  dateRange: '18 - 20 Oct 2024 (3 Full Days)',
  timezone: 'WIB (UTC+7)',
  locationLine: 'Hall A & B, Grand City Surabaya',
  heroImage:
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
  cardImage:
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  priceFrom: 35,
  priceTo: 120,
  host: {
    name: 'VoiceTech Community & GoEvent Labs',
    tagline: 'Premier Tech & Live Experience Producer · 42 Past Events',
    rating: 4.98,
    followers: '12.4k',
    pastEvents: 42,
    initials: 'VT',
  },
  about: [
    'The Global AI & Cybersecurity Summit 2025 unites 1,500+ world-class software engineers, cybersecurity researchers, founders, and students in Southeast Asia’s biggest hybrid production. Over three adrenaline-packed days, experience live attack-defense simulations, generative models scaling pipelines, and high-energy music keynote finales.',
    'Whether you are architecting multi-agent LLM systems, hardening critical infrastructure against quantum vector exploits, or looking for your next breakthrough role at the tech career expo, this conference is engineered for technical depth and unforgettable energy.',
  ],
  highlights: [
    {
      icon: 'terminal',
      title: 'Red vs Blue War Rooms',
      body: 'Real-time live hacking and defensive posture showcases led by senior military-grade security leads.',
    },
    {
      icon: 'brain',
      title: '18+ AI Frontier Keynotes',
      body: 'Unfiltered architectural breakdowns on LLM fine-tuning, retrieval pipelines, and sovereign AI compute.',
    },
    {
      icon: 'briefcase',
      title: 'Exclusive Career Pavilion',
      body: 'Direct hiring pipelines with 30+ leading multinational tech ventures and venture builders.',
    },
    {
      icon: 'music',
      title: 'Grand Stage Live Sound Finale',
      body: 'Full arena sound and lighting production with headline indie-rock and electronic live sets.',
    },
  ],
  tags: {
    topic: [
      'Technology',
      'Artificial Intelligence',
      'Software Development',
      'Cybersecurity',
      'Business',
      'Career',
      'Networking',
    ],
    format: ['Workshop', 'Seminar', 'Conference', 'Exhibition'],
    audience: ['University Students', 'Public'],
  },
  days: [
    {
      id: 'day-1',
      label: 'Day 1 · 18 Oct 2024',
      title: 'Foundations & Keynotes',
      hours: '09:00 AM - 05:00 PM WIB',
      sessions: [
        {
          id: 'day-1-s1',
          time: '09:30',
          stage: 'Main Stage',
          duration: '60 Mins',
          title: 'Keynote: Sovereign AI Infrastructure & Foundation Models',
          speaker: 'Dr. Aris Thorne (Chief AI Scientist, HyperScale Labs)',
        },
        {
          id: 'day-1-s2',
          time: '11:15',
          stage: 'Cyber Lab B',
          duration: '90 Mins · Hands-on',
          title: 'Live Attack Simulation: Zero-Trust Lateral Movement Defense',
          speaker: 'Siti Nurhaliza & BlackHat Asia Defense Fellows',
        },
        {
          id: 'day-1-s3',
          time: '02:30',
          stage: 'Hall A Expo',
          duration: 'Networking & Pitch',
          title: 'Regional Venture Pitch Arena & Tech Talent Speedmatch',
          speaker: 'Over 24 Seed & Series-A startups with open engineering roles',
        },
      ],
    },
    {
      id: 'day-2',
      label: 'Day 2 · 19 Oct 2024',
      title: 'War Room & Hackathon',
      hours: '10:00 AM - 06:00 PM WIB',
      sessions: [
        {
          id: 'day-2-s1',
          time: '10:00',
          stage: 'Cyber Lab A',
          duration: '120 Mins',
          title: 'Capture-the-Flag: Quantum Vector Exploit Chain',
          speaker: 'Kevin Pramono (VP of Cloud Infra, Nusantara Cloud)',
        },
        {
          id: 'day-2-s2',
          time: '01:00',
          stage: 'Hackathon Floor',
          duration: '180 Mins · Build',
          title: 'Multi-Agent LLM Build Sprint with live mentorship',
          speaker: 'Dr. Aris Thorne & HyperScale Labs engineers',
        },
        {
          id: 'day-2-s3',
          time: '04:30',
          stage: 'Main Stage',
          duration: '60 Mins',
          title: 'Panel: Defending national infrastructure at machine speed',
          speaker: 'Siti Nurhaliza & regional CERT leads',
        },
      ],
    },
    {
      id: 'day-3',
      label: 'Day 3 · 20 Oct 2024',
      title: 'Finale & Live Concert',
      hours: '01:00 PM - 09:30 PM WIB',
      sessions: [
        {
          id: 'day-3-s1',
          time: '01:00',
          stage: 'Hall A Expo',
          duration: '90 Mins',
          title: 'Career Pavilion: on-the-spot engineering interviews',
          speaker: '30+ hiring partners',
        },
        {
          id: 'day-3-s2',
          time: '03:30',
          stage: 'Main Stage',
          duration: '90 Mins',
          title: 'Hackathon finals & closing keynote',
          speaker: 'VoiceTech Community & GoEvent Labs',
        },
        {
          id: 'day-3-s3',
          time: '07:30',
          stage: 'Grand Stage',
          duration: '120 Mins',
          title: 'LE PHARAOHS live concert finale',
          speaker: 'Headline live show with full arena production',
        },
      ],
    },
  ],
  speakers: [
    {
      id: 'sp-1',
      name: 'Dr. Aris Thorne',
      role: 'Head of AI Research',
      org: 'HyperScale Labs',
      image: PORTRAITS[0],
    },
    {
      id: 'sp-2',
      name: 'Siti Nurhaliza',
      role: 'Principal SecOps Lead',
      org: 'CyberDefense Global',
      image: PORTRAITS[1],
    },
    {
      id: 'sp-3',
      name: 'Kevin Pramono',
      role: 'VP of Cloud Infra',
      org: 'Nusantara Cloud',
      image: PORTRAITS[2],
    },
    {
      id: 'sp-4',
      name: 'LE PHARAOHS',
      role: 'Headline Live Show',
      org: 'Concert Finale',
      image: PORTRAITS[3],
      badge: 'HEADLINER',
    },
  ],
  venue: {
    name: 'Grand City Convention & Exhibition Center',
    address: 'Jl. Walikota Mustajab No.1, Ketabang, Genteng, Surabaya, East Java 60272',
    city: 'Surabaya',
    entrance: 'Hall A & B · Main Entrance',
    shuttle: 'Shuttle dropoff at South Lobby Door 3 every 20 minutes.',
    perks: [
      { icon: 'shuttle', label: 'Free ITS & UNAIR shuttle' },
      { icon: 'parking', label: '1,200+ secure parking bays' },
      { icon: 'accessible', label: 'Wheelchair accessible hall' },
    ],
    mapQuery: 'Grand City Convention & Exhibition Center, Surabaya',
  },
  tickets: [
    {
      id: 'student',
      name: 'Student Pass',
      badge: 'ID Req.',
      description: 'Full 3-Day Expo access, Code Labs & Student Lounge.',
      price: 35,
      compareAt: 50,
      note: 'per student',
      maxPerOrder: 4,
      remaining: 90,
    },
    {
      id: 'general',
      name: 'General Attendee',
      badge: 'Standard',
      description: 'Access to all keynotes, hackathon arena & job expo.',
      price: 55,
      note: 'per person',
      maxPerOrder: 6,
      remaining: 420,
    },
    {
      id: 'vip',
      name: 'VIP & Backstage',
      badge: 'VIP',
      description:
        'Priority seating, speaker dinner gala, merchandise kit & concert backstage.',
      price: 120,
      note: 'all inclusive',
      maxPerOrder: 4,
      remaining: 40,
    },
  ],
  requirements:
    'Please present a valid student ID card or national identification alongside your digital QR pass at Registration Desk West. Doors open strictly 45 minutes prior to session kick-offs.',
  studentDiscount: 'Students save 30% with a valid campus ID at check-in.',
  related: [],
};

const GENERATED_DETAILS: EventDetail[] = [
  ...browsingConcerts.map((card) =>
    buildMusicDetail({
      slug: card.slug,
      title: card.title,
      subtitle: card.artistSubtitle,
      category: card.category === 'Festival' ? 'Festival' : 'Live Concert',
      kind: 'music',
      dayOfWeek: card.dayOfWeek,
      dayNumber: card.dayNumber,
      monthYear: card.monthYear,
      city: card.city,
      venue: card.venue,
      price: card.price,
      imageUrl: card.imageUrl,
    })
  ),
  ...tourEvents.map((tour) => {
    const heroImages: Record<string, string> = {
      BANGKOK: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1600&q=80',
      JAKARTA: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80',
      SURABAYA: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1600&q=80',
      BALI: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
      'KUALA LUMPUR': 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80',
      TOKYO: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
      SEOUL: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1600&q=80',
    };

    return buildMusicDetail({
      slug: tour.slug,
      title: `LE PHARAOHS · ${tour.city}`,
      subtitle: tour.tourSubtitle,
      category: 'Tour',
      kind: 'music',
      dayOfWeek: tour.dayOfWeek,
      dayNumber: tour.dayNumber,
      monthYear: tour.monthYear,
      city: tour.city,
      venue: tour.region === 'Asia' ? 'Main Arena' : 'Stadium Dome',
      price: tour.price,
      imageUrl: heroImages[tour.city] ?? heroImages.BANGKOK,
    });
  }),
  ...upcomingConcerts.map((card) =>
    buildMusicDetail({
      slug: card.slug,
      title: card.title,
      subtitle: card.subtitle,
      category: 'Live Concert',
      kind: 'music',
      dayOfWeek: card.dayOfWeek,
      dayNumber: card.dayNumber,
      monthYear: card.monthYear,
      city: card.tags[0] ?? 'Jakarta',
      venue: card.tags[1] ?? 'Main Arena',
      price: card.price,
      imageUrl: card.imageUrl,
    })
  ),
];

const ALL_DETAILS: EventDetail[] = [FLAGSHIP, ...GENERATED_DETAILS];

// Every event recommends the next three records, cycling through the list.
const RELATED_COUNT = 3;
ALL_DETAILS.forEach((detail, index) => {
  detail.related = Array.from({ length: RELATED_COUNT }, (_, offset) => {
    const next = ALL_DETAILS[(index + offset + 1) % ALL_DETAILS.length];
    return next.slug;
  });
});

export function listSampleEvents(): EventDetail[] {
  return ALL_DETAILS;
}

export function getSampleEvent(slug: string): EventDetail | undefined {
  return ALL_DETAILS.find((event) => event.slug === slug);
}

export function getRelatedEvents(detail: EventDetail): EventDetail[] {
  return detail.related
    .map((slug) => getSampleEvent(slug))
    .filter((event): event is EventDetail => Boolean(event));
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
