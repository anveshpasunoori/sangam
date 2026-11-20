export type Audience = "Public" | "Friends" | "Close friends" | "Only me";
export type FeedMode = "foryou" | "friends" | "following";
export type Lang = "en" | "hi" | "te";
export type Theme = "system" | "light" | "dark";
export type ArtKind = "hills" | "kolam" | "lake" | "city" | "lamp";

export interface User {
  id: string;
  name: string;
  handle: string;
  hue: number;
  bio: string;
  verified?: boolean;
}

export interface Comment {
  by: string;
  text: string;
}

export interface Poll {
  question: string;
  options: { label: string; votes: number }[];
  myVote: number | null;
}

export type PostSource = "friend" | "following" | "rec" | "me";

export interface Post {
  id: string;
  by: string;
  /** Minutes before the seed time; new posts use createdAt instead. */
  ageMin: number;
  createdAt?: number;
  source: PostSource;
  audience: Audience;
  text: string;
  lang?: Lang;
  translation?: string;
  art?: [ArtKind, number] | null;
  alt?: string;
  poll?: Poll | null;
  likes: number;
  comments: Comment[];
  issueId?: string;
  why: string;
}

export interface Draft {
  id: string;
  text: string;
  audience: Audience;
  art: ArtKind | null;
  alt: string;
  poll: boolean;
  pollOptions: [string, string];
}

export interface Story {
  by: string;
  art: [ArtKind, number];
  text: string;
}

export interface Reel {
  id: string;
  by: string;
  art: [ArtKind, number];
  caption: string;
  title: string;
  likes: number;
}

export type Rsvp = "Going" | "Interested" | null;

export interface CommunityEvent {
  id: string;
  title: string;
  when: string;
  place: string;
  rsvp: Rsvp;
}

export type Membership = "member" | "requested" | "none";

export interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  privacy: "Public" | "Private";
  hue: number;
  membership: Membership;
  rules: string[];
  events: CommunityEvent[];
  postIds: string[];
}

export interface ChatMessage {
  mine?: boolean;
  text: string;
}

export interface Chat {
  id: string;
  with: string;
  unread: number;
  messages: ChatMessage[];
}

export interface MessageRequest {
  id: string;
  from: string;
  text: string;
}

export interface Notification {
  id: string;
  icon: "civic" | "shield" | "groups" | "chat";
  text: string;
  href: string;
  unread: boolean;
}

/* ---------- Sangam Civic ---------- */
export type CivicState =
  | "DRAFT"
  | "SUBMITTED"
  | "TRIAGED"
  | "ROUTING_PENDING"
  | "ROUTED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESPONSE_RECEIVED"
  | "RESOLUTION_REVIEW"
  | "RESOLVED"
  | "UNRESOLVED"
  | "CLOSED"
  | "WITHDRAWN"
  | "REJECTED"
  | "DUPLICATE"
  | "REOPENED"
  | "ESCALATED";

/** u = the complainant's own statement, s = a platform step, o = an official response. */
export type ActorKind = "u" | "s" | "o";

export interface CivicLogEntry {
  date: string;
  state: CivicState;
  actor: string;
  kind: ActorKind;
  text: string;
}

export interface Evidence {
  name: string;
  size: string;
  hash: string;
}

export type CivicVisibility =
  | "Public summary, identity hidden"
  | "Public summary with my name"
  | "Private";

export interface CivicCase {
  id: string;
  ref: string;
  category: string;
  title: string;
  description: string;
  location: string;
  visibility: CivicVisibility;
  authority: string;
  state: CivicState;
  escalated: boolean;
  evidence: Evidence[];
  log: CivicLogEntry[];
}

export interface CivicDraft {
  step: number;
  category: string;
  title: string;
  description: string;
  location: string;
  visibility: CivicVisibility;
  evidence: Evidence[];
  confirmed: boolean;
}

export interface CommunityIssue {
  id: string;
  category: string;
  title: string;
  ward: string;
  affected: number;
  acknowledged: boolean;
  state: CivicState;
  myCaseId?: string;
}

/* ---------- Trust & safety ---------- */
export type ModStatus =
  | "Hidden"
  | "Held for review"
  | "Appeal submitted"
  | "Restored on appeal"
  | "Published after review";

export interface ModDecision {
  id: string;
  what: string;
  quote: string;
  rule: string;
  decidedBy: string;
  status: ModStatus;
  log: { date: string; text: string }[];
}

export interface UserReport {
  id: string;
  subject: string;
  reason: string;
}

/* ---------- Ombudsman ---------- */
export type OmbState =
  | "RECEIVED"
  | "CONFLICT_CHECK"
  | "ASSIGNED"
  | "UNDER_REVIEW"
  | "FINDINGS_ISSUED"
  | "CORRECTIVE_ACTION"
  | "CLOSED";

export interface OmbCase {
  id: string;
  ref: string;
  type: string;
  description: string;
  state: OmbState;
  log: { date: string; state: OmbState; text: string }[];
}

/* ---------- App state ---------- */
export interface Privacy {
  defaultAudience: Audience;
  whoCanMessage: "Everyone" | "Friends";
  localDiscovery: boolean;
  personalised: boolean;
}

export interface Prefs {
  lang: Lang;
  theme: Theme;
  scale: number;
  reducedMotion: boolean;
  dataSaver: boolean;
  offline: boolean;
  reelCaptions: boolean;
  onboarded: boolean;
}

export interface Compose {
  text: string;
  audience: Audience | null;
  art: ArtKind | null;
  alt: string;
  poll: boolean;
  pollOptions: [string, string];
}

export interface State {
  version: number;
  seq: number;
  users: Record<string, User>;
  friends: string[];
  following: string[];
  friendRequests: string[];
  liked: string[];
  saved: string[];
  muted: string[];
  blocked: string[];
  hiddenPosts: string[];
  showLess: string[];
  seenStories: number[];
  translated: string[];
  privacy: Privacy;
  prefs: Prefs;
  feedMode: FeedMode;
  posts: Post[];
  drafts: Draft[];
  compose: Compose;
  stories: Story[];
  reels: Reel[];
  communities: Community[];
  chats: Chat[];
  requests: MessageRequest[];
  notifications: Notification[];
  cases: CivicCase[];
  civicDraft: CivicDraft | null;
  issues: CommunityIssue[];
  supported: string[];
  decisions: ModDecision[];
  reports: UserReport[];
  ombudsman: OmbCase[];
}
