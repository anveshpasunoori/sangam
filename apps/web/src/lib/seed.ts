import type { State, User } from "./types";

/** All people, places and figures here are fictional demonstration data. */
const users: Record<string, User> = {
  me: { id: "me", name: "Arjun Mehra", handle: "arjun.demo", hue: 0, bio: "Cyclist, amateur photographer, Navapur resident." },
  meera: { id: "meera", name: "Meera Iyer", handle: "meera.iyer", hue: 1, bio: "Teacher. Weekend baker." },
  kabir: { id: "kabir", name: "Kabir Anand", handle: "kabir.a", hue: 2, bio: "Writes about cities and buses." },
  tanvi: { id: "tanvi", name: "Tanvi Kulkarni", handle: "tanvi.k", hue: 3, bio: "Illustrator. Kolam every morning.", verified: true },
  joseph: { id: "joseph", name: "Joseph Mathew", handle: "joseph.m", hue: 5, bio: "Lake clean-up volunteer." },
  zoya: { id: "zoya", name: "Zoya Khan", handle: "zoya.codes", hue: 4, bio: "Chai & Code. Short lessons for new programmers.", verified: true },
  lakshmi: { id: "lakshmi", name: "Lakshmi Reddy", handle: "lakshmi.r", hue: 6, bio: "Librarian, Navapur." },
  harpreet: { id: "harpreet", name: "Harpreet Gill", handle: "harpreet.g", hue: 7, bio: "Runs the Sunday cycling loop." },
  ncc: { id: "ncc", name: "Navapur Cycling Club", handle: "navapur.cycling", hue: 1, bio: "Community page. Rides every Sunday, 6 am." },
};

export const STATE_VERSION = 1;

export function seed(): State {
  return {
    version: STATE_VERSION,
    seq: 100,
    users: structuredClone(users),
    friends: ["meera", "kabir", "joseph"],
    following: ["tanvi", "zoya", "ncc", "meera", "kabir", "joseph"],
    friendRequests: [],
    liked: [],
    saved: ["p3"],
    muted: [],
    blocked: [],
    hiddenPosts: [],
    showLess: [],
    seenStories: [],
    translated: [],
    privacy: { defaultAudience: "Friends", whoCanMessage: "Friends", localDiscovery: false, personalised: true },
    prefs: {
      lang: "en",
      theme: "system",
      scale: 1,
      reducedMotion: false,
      dataSaver: false,
      offline: false,
      reelCaptions: true,
      onboarded: false,
    },
    feedMode: "foryou",
    posts: [
      {
        id: "p1", by: "kabir", ageMin: 35, source: "friend", audience: "Public",
        text: "Third week the Ring Road streetlights have been out. The corporation’s response so far has been poor, and people walking home after dark deserve better.",
        art: ["lamp", 3], likes: 48, issueId: "i1",
        comments: [{ by: "meera", text: "Same on our stretch. Added my name to the issue." }],
        why: "Kabir is your friend",
      },
      {
        id: "p2", by: "tanvi", ageMin: 90, source: "following", audience: "Public",
        text: "Day 212 of a kolam a day. Today’s has 25 dots and one unbroken line.",
        art: ["kolam", 0], likes: 312, comments: [{ by: "lakshmi", text: "The symmetry in this one is lovely." }],
        why: "You follow Tanvi",
      },
      {
        id: "p3", by: "meera", ageMin: 150, source: "friend", audience: "Friends", lang: "hi",
        text: "आज सुबह की सैर के बाद झील किनारे चाय। छोटी-छोटी खुशियाँ।",
        translation: "Tea by the lake after this morning’s walk. Small joys.",
        art: ["lake", 1], likes: 21, comments: [], why: "Meera is your friend",
      },
      {
        id: "p4", by: "lakshmi", ageMin: 260, source: "rec", audience: "Public", lang: "te",
        text: "మా వీధిలో కొత్త గ్రంథాలయం ప్రారంభమైంది. పిల్లలకు ఉచిత సభ్యత్వం!",
        translation: "A new library has opened on our street. Free membership for children!",
        art: ["city", 2], likes: 87, comments: [], why: "Popular in Navapur Readers, a community you joined",
      },
      {
        id: "p5", by: "zoya", ageMin: 420, source: "following", audience: "Public",
        text: "Poll for the next Chai & Code lesson.",
        poll: {
          question: "What should I explain next?",
          options: [{ label: "Loops", votes: 41 }, { label: "Functions", votes: 63 }, { label: "Reading error messages", votes: 88 }],
          myVote: null,
        },
        likes: 140, comments: [], why: "You follow Zoya",
      },
      {
        id: "p6", by: "joseph", ageMin: 1500, source: "friend", audience: "Friends",
        text: "Lake clean-up this Saturday, 7 am at the east gate. Gloves and bags provided. Bring a friend.",
        art: ["hills", 1], likes: 33, comments: [], why: "Joseph is your friend",
      },
      {
        id: "p7", by: "harpreet", ageMin: 2000, source: "rec", audience: "Public",
        text: "42 km before breakfast. The new cycle lane on Canal Road makes the whole loop feel safer.",
        art: ["hills", 0], likes: 59, comments: [], why: "Similar to posts you liked about cycling",
      },
    ],
    drafts: [],
    compose: { text: "", audience: null, art: null, alt: "", poll: false, pollOptions: ["", ""] },
    stories: [
      { by: "tanvi", art: ["kolam", 2], text: "Rice flour, steady hands." },
      { by: "joseph", art: ["lake", 1], text: "East gate, Saturday 7 am." },
      { by: "ncc", art: ["hills", 0], text: "Sunday loop: 38 km, easy pace." },
      { by: "zoya", art: ["city", 3], text: "New lesson drops tonight." },
    ],
    reels: [
      { id: "r1", by: "zoya", art: ["city", 3], caption: "A loop repeats a step until a condition is met.", title: "Loops in 30 seconds", likes: 2140 },
      { id: "r2", by: "tanvi", art: ["kolam", 0], caption: "Start from the centre dot and never lift your hand.", title: "One-line kolam, slowed down", likes: 5310 },
      { id: "r3", by: "ncc", art: ["hills", 1], caption: "Canal Road cycle lane, sunrise.", title: "Sunday loop highlights", likes: 804 },
    ],
    communities: [
      {
        id: "c1", name: "Navapur Readers", description: "Monthly book swaps and library news.", members: 1240, privacy: "Public", hue: 2,
        membership: "member", rules: ["Be kind in disagreement.", "No spoilers without a warning."],
        events: [{ id: "e1", title: "Book swap at the new library", when: "Sat 21 Nov, 5 pm", place: "Gandhi Street Library", rsvp: null }],
        postIds: ["p4"],
      },
      {
        id: "c2", name: "Navapur Cycling Club", description: "Rides every Sunday. All paces welcome.", members: 860, privacy: "Public", hue: 1,
        membership: "member", rules: ["Helmets on every ride.", "Wait at regroup points."],
        events: [{ id: "e2", title: "Sunday loop, 38 km", when: "Sun 22 Nov, 6 am", place: "Clock Tower", rsvp: "Going" }],
        postIds: ["p7"],
      },
      {
        id: "c3", name: "Lake View Colony Residents", description: "Residents only. Maintenance, water and waste updates.", members: 310, privacy: "Private", hue: 5,
        membership: "none", rules: ["Residents only.", "No sharing of neighbours’ personal details."], events: [], postIds: [],
      },
      {
        id: "c4", name: "Street Food Trails", description: "Honest reviews of carts and corners.", members: 5600, privacy: "Public", hue: 4,
        membership: "none", rules: ["Review the food, not the person."],
        events: [{ id: "e3", title: "Old Market chaat walk", when: "Fri 27 Nov, 6 pm", place: "Old Market Gate", rsvp: null }],
        postIds: [],
      },
    ],
    chats: [
      { id: "m1", with: "meera", unread: 2, messages: [{ text: "Are you coming to the book swap?" }, { text: "I can bring the extra copies." }] },
      { id: "m2", with: "joseph", unread: 0, messages: [{ mine: true, text: "Count me in for Saturday." }, { text: "Great, east gate at 7." }] },
      { id: "m3", with: "kabir", unread: 0, messages: [{ text: "Did you see the streetlight issue page?" }] },
    ],
    requests: [{ id: "q1", from: "harpreet", text: "Hi! Saw your Canal Road photos. Want to join the Sunday loop?" }],
    notifications: [
      { id: "n1", icon: "civic", text: "Your complaint SGM-C-1042 needs your review: was the issue fixed?", href: "/civic/cases/k2", unread: true },
      { id: "n2", icon: "shield", text: "A comment you posted was hidden. You can appeal this decision.", href: "/safety/decisions/d1", unread: true },
      { id: "n3", icon: "groups", text: "Navapur Readers added an event: Book swap at the new library.", href: "/communities/c1", unread: false },
      { id: "n4", icon: "chat", text: "Harpreet Gill sent you a message request.", href: "/messages?tab=requests", unread: false },
    ],
    cases: [
      {
        id: "k1", ref: "SGM-C-1038", category: "Electricity", title: "Streetlights out on Ring Road, Sector 4",
        description: "Eleven consecutive streetlights between the petrol pump and the school gate have not worked for three weeks.",
        location: "Ring Road, Sector 4, Ward 12", visibility: "Public summary, identity hidden",
        authority: "Navapur Municipal Corporation, Electrical Wing (fictional)", state: "IN_PROGRESS", escalated: false,
        evidence: [
          { name: "ring-road-night-1.jpg", size: "2.1 MB", hash: "9f2c…41ab" },
          { name: "ring-road-night-2.jpg", size: "1.8 MB", hash: "03de…7c10" },
        ],
        log: [
          { date: "28 Oct", state: "SUBMITTED", actor: "You", kind: "u", text: "Complaint submitted with 2 photos." },
          { date: "29 Oct", state: "TRIAGED", actor: "Sangam Civic triage (simulated)", kind: "s", text: "No duplicates found. Category confirmed as Electricity." },
          { date: "29 Oct", state: "ROUTED", actor: "Sangam Civic (simulated)", kind: "s", text: "You were shown the verified official channel and confirmed you filed there." },
          { date: "2 Nov", state: "ACKNOWLEDGED", actor: "Authority (simulated)", kind: "o", text: "Simulated acknowledgement for demonstration. Not a real government record." },
          { date: "9 Nov", state: "IN_PROGRESS", actor: "Authority (simulated)", kind: "o", text: "Simulated update: inspection scheduled." },
        ],
      },
      {
        id: "k2", ref: "SGM-C-1042", category: "Waste", title: "Garbage not collected for 6 days, Lake View Colony",
        description: "The collection vehicle has skipped Lanes 3 to 5 since last Monday. Bins are overflowing near the park gate.",
        location: "Lake View Colony, Lanes 3–5, Ward 7", visibility: "Public summary, identity hidden",
        authority: "Navapur Municipal Corporation, Sanitation Wing (fictional)", state: "RESOLUTION_REVIEW", escalated: false,
        evidence: [{ name: "bins-park-gate.jpg", size: "2.4 MB", hash: "b71a…e902" }],
        log: [
          { date: "5 Nov", state: "SUBMITTED", actor: "You", kind: "u", text: "Complaint submitted with 1 photo." },
          { date: "5 Nov", state: "TRIAGED", actor: "Sangam Civic triage (simulated)", kind: "s", text: "Linked to 3 similar reports from the same lanes." },
          { date: "6 Nov", state: "ROUTED", actor: "Sangam Civic (simulated)", kind: "s", text: "Guided hand-off to the verified official channel." },
          { date: "7 Nov", state: "ACKNOWLEDGED", actor: "Authority (simulated)", kind: "o", text: "Simulated acknowledgement for demonstration." },
          { date: "12 Nov", state: "RESPONSE_RECEIVED", actor: "Authority (simulated)", kind: "o", text: "Simulated response: collection resumed on 11 Nov." },
          { date: "12 Nov", state: "RESOLUTION_REVIEW", actor: "Sangam Civic (simulated)", kind: "s", text: "Waiting for you to confirm whether the issue is fixed." },
        ],
      },
    ],
    civicDraft: null,
    issues: [
      { id: "i1", category: "Electricity", title: "Streetlights out on Ring Road, Sector 4", ward: "Ward 12", affected: 27, acknowledged: true, state: "IN_PROGRESS", myCaseId: "k1" },
      { id: "i2", category: "Sanitation", title: "Open drain beside the primary school gate", ward: "Ward 9", affected: 42, acknowledged: false, state: "ROUTED" },
      { id: "i3", category: "Transport", title: "Route 14 buses skipping the Old Market stop", ward: "Ward 3", affected: 18, acknowledged: true, state: "RESPONSE_RECEIVED" },
      { id: "i4", category: "Water", title: "Low pressure in the morning supply, Canal Road", ward: "Ward 12", affected: 9, acknowledged: false, state: "TRIAGED" },
    ],
    supported: [],
    decisions: [
      {
        id: "d1", what: "Your comment on Kabir Anand’s post",
        quote: "This plan is a mess and whoever approved it should explain why.",
        rule: "Harassment", decidedBy: "Automated screening", status: "Hidden",
        log: [{ date: "13 Nov", text: "Hidden by automated screening. No human has reviewed it yet." }],
      },
    ],
    reports: [],
    ombudsman: [
      {
        id: "o1", ref: "SGM-O-0217", type: "Unresolved support complaint",
        description: "My verification request received no reply for six weeks.", state: "UNDER_REVIEW",
        log: [
          { date: "2 Nov", state: "RECEIVED", text: "Complaint received." },
          { date: "3 Nov", state: "CONFLICT_CHECK", text: "No reviewer conflicts found (simulated)." },
          { date: "4 Nov", state: "ASSIGNED", text: "Assigned to an independent reviewer (simulated)." },
          { date: "8 Nov", state: "UNDER_REVIEW", text: "Reviewer requested the support ticket history (simulated)." },
        ],
      },
    ],
  };
}

/** Fictional aggregates for the accountability dashboard: [category, total, acknowledged, median days to first response]. */
export const CIVIC_AGGREGATES: [string, number, number, number][] = [
  ["Roads", 34, 21, 6],
  ["Waste", 29, 22, 4],
  ["Water", 22, 12, 9],
  ["Electricity", 18, 13, 5],
  ["Sanitation", 16, 7, 11],
  ["Transport", 11, 8, 7],
];

export const TRENDING_TAGS = ["#NavapurCycles", "#KolamADay", "#LakeCleanUp", "#ChaiAndCode", "#RingRoadLights"];
