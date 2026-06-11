export type Contact = {
  name: string;
  title: string;
  linkedin?: string;
  email?: string;
  notes?: string;
};

export type TalkingPoint = {
  title: string;
  detail: string;
};

export type Meeting = {
  id: string;
  date: string; // ISO string
  duration: number; // minutes
  company: string;
  companyLogo?: string;
  industry: string;
  website?: string;
  contacts: Contact[];
  status: "upcoming" | "completed" | "cancelled";
  brief?: Brief;
};

export type NewsItem = {
  titre: string;
  description: string;
  url: string;
  source: string;
  date: string | null;
};

export type Brief = {
  companyOverview: string;
  revenue?: string;
  employees?: string;
  recentNews: string[];
  painPoints: TalkingPoint[];
  talkingPoints: TalkingPoint[];
  objectives: string[];
  competitorsUsed?: string[];
  suggestedOpeningLine?: string;
  keywords?: string[];
  actualites?: NewsItem[];
  references?: Array<{ client_name: string; relevance: string; pitch: string }>;
};
