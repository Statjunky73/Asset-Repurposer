import { z } from "zod";

export const ContentCategorySchema = z.enum([
  "nudity_sexual_content",
  "graphic_violence",
  "hate_speech",
  "copyrighted_material",
  "age_restricted_substances",
  "dangerous_activities",
  "harassment_bullying",
]);
export type ContentCategory = z.infer<typeof ContentCategorySchema>;

export const PolicyPlatformSchema = z.enum([
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "linkedin",
  "pinterest",
  "snapchat",
  "threads",
  "reddit",
]);
export type PolicyPlatform = z.infer<typeof PolicyPlatformSchema>;

export const PolicyFlagSchema = z.object({
  category: ContentCategorySchema,
  platform: z.union([PolicyPlatformSchema, z.literal("imagine")]),
  platformLabel: z.string(),
  ruleTitle: z.string(),
  ruleText: z.string(),
  severity: z.enum(["heads-up", "likely-violation"]),
  source: z.enum(["image", "text"]),
});
export type PolicyFlag = z.infer<typeof PolicyFlagSchema>;

const PLATFORM_LABELS: Record<PolicyPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  snapchat: "Snapchat",
  threads: "Threads",
  reddit: "Reddit",
};

type RuleEntry = { ruleTitle: string; ruleText: string; severity: "heads-up" | "likely-violation" };

// Curated, plain-language summaries of each platform's publicly known community
// guidelines, grouped by content category. Kept server-side so the model only
// has to classify categories — the exact rule text quoted to the user always
// comes from here, not from the model's memory.
const KB: Record<ContentCategory, Partial<Record<PolicyPlatform, RuleEntry>>> = {
  nudity_sexual_content: {
    instagram: {
      ruleTitle: "Adult Nudity and Sexual Activity",
      ruleText:
        "Instagram restricts nudity and sexual activity, with limited exceptions for breastfeeding, post-mastectomy scarring, and art such as paintings or sculptures.",
      severity: "likely-violation",
    },
    tiktok: {
      ruleTitle: "Nudity and Sexual Activity",
      ruleText:
        "TikTok removes content depicting or promoting sexually explicit content, and restricts non-explicit nudity outside of clear artistic or educational contexts.",
      severity: "likely-violation",
    },
    facebook: {
      ruleTitle: "Adult Nudity and Sexual Activity",
      ruleText:
        "Facebook restricts nudity and sexually explicit content, with exceptions for breastfeeding, health-related, and protest contexts.",
      severity: "likely-violation",
    },
    pinterest: {
      ruleTitle: "Nudity and sexually explicit content",
      ruleText:
        "Pinterest doesn't allow nudity or sexually explicit content, including content that's overly suggestive or graphic.",
      severity: "likely-violation",
    },
    youtube: {
      ruleTitle: "Nudity and Sexual Content policy",
      ruleText:
        "YouTube doesn't allow content on the platform that's meant to be sexually gratifying, and age-restricts content that contains nudity or sexual content in non-graphic, non-gratuitous contexts.",
      severity: "likely-violation",
    },
    snapchat: {
      ruleTitle: "Nudity and Sexually Explicit Content",
      ruleText:
        "Snapchat prohibits nudity and content that depicts sexually explicit activity.",
      severity: "likely-violation",
    },
  },
  graphic_violence: {
    instagram: {
      ruleTitle: "Violence and Incitement",
      ruleText:
        "Instagram removes content that glorifies violence or celebrates the suffering of others, and adds warning screens to graphic violent content shared for awareness.",
      severity: "heads-up",
    },
    facebook: {
      ruleTitle: "Violent and Graphic Content",
      ruleText:
        "Facebook removes content that celebrates violence, and places warning labels on disturbing content shared for informational or documentary purposes.",
      severity: "heads-up",
    },
    tiktok: {
      ruleTitle: "Violent and Graphic Content",
      ruleText:
        "TikTok removes content depicting gratuitous, gory, or extremely violent content, including real-world footage of serious violence.",
      severity: "likely-violation",
    },
    youtube: {
      ruleTitle: "Violent or graphic content policy",
      ruleText:
        "YouTube doesn't allow content that's intended to shock or disgust viewers, or gratuitous violence not in a news, documentary, scientific, or artistic context.",
      severity: "heads-up",
    },
    reddit: {
      ruleTitle: "Violent Content policy",
      ruleText:
        "Reddit prohibits content that depicts, encourages, or glorifies graphic violence.",
      severity: "likely-violation",
    },
  },
  hate_speech: {
    instagram: {
      ruleTitle: "Hate Speech",
      ruleText:
        "Instagram doesn't allow attacks against people based on protected characteristics such as race, ethnicity, national origin, religion, sexual orientation, or disability.",
      severity: "likely-violation",
    },
    facebook: {
      ruleTitle: "Hate Speech",
      ruleText:
        "Facebook removes direct attacks on people based on protected characteristics, including dehumanizing speech, slurs, and calls for exclusion or segregation.",
      severity: "likely-violation",
    },
    tiktok: {
      ruleTitle: "Hate Speech and Hateful Ideologies",
      ruleText:
        "TikTok removes hate speech and content that attacks people based on protected attributes, as well as hateful symbols and ideologies.",
      severity: "likely-violation",
    },
    x: {
      ruleTitle: "Hateful Conduct policy",
      ruleText:
        "X prohibits directly attacking people based on protected categories such as race, ethnicity, national origin, religion, disability, or gender identity.",
      severity: "likely-violation",
    },
    youtube: {
      ruleTitle: "Hate speech policy",
      ruleText:
        "YouTube removes content that promotes violence or hatred against individuals or groups based on protected attributes.",
      severity: "likely-violation",
    },
    linkedin: {
      ruleTitle: "Professional Community Policies — Hateful or discriminatory content",
      ruleText:
        "LinkedIn prohibits content that attacks, demeans, or excludes people based on protected characteristics.",
      severity: "likely-violation",
    },
    reddit: {
      ruleTitle: "Promoting Hate Based on Identity or Vulnerability",
      ruleText:
        "Reddit prohibits content that promotes hate based on identity or vulnerability, including protected characteristics.",
      severity: "likely-violation",
    },
  },
  copyrighted_material: {
    youtube: {
      ruleTitle: "Copyright policy",
      ruleText:
        "YouTube requires you to own or have permission to use any copyrighted material (music, clips, images) in your uploads — unauthorized use can result in a copyright strike.",
      severity: "heads-up",
    },
    instagram: {
      ruleTitle: "Intellectual Property",
      ruleText:
        "Instagram requires that you only post content that you've created or that you have permission to share; using others' copyrighted music, art, or footage without rights can get content removed.",
      severity: "heads-up",
    },
    facebook: {
      ruleTitle: "Intellectual Property",
      ruleText:
        "Facebook removes content that infringes on someone else's copyright or trademark unless you have the rights or a valid exception applies.",
      severity: "heads-up",
    },
    tiktok: {
      ruleTitle: "Intellectual Property",
      ruleText:
        "TikTok requires that uploaded content doesn't infringe on the intellectual property rights of others, including music and video clips.",
      severity: "heads-up",
    },
  },
  age_restricted_substances: {
    instagram: {
      ruleTitle: "Regulated Goods — Drugs and Alcohol",
      ruleText:
        "Instagram restricts promotion or sale of drugs, and requires alcohol-related content to comply with local legal drinking age requirements and not target minors.",
      severity: "heads-up",
    },
    tiktok: {
      ruleTitle: "Illegal Activities and Regulated Goods",
      ruleText:
        "TikTok prohibits depicting, promoting, or facilitating the trade of drugs and other regulated goods, and restricts content showing alcohol or tobacco consumption where it could appeal to minors.",
      severity: "heads-up",
    },
    facebook: {
      ruleTitle: "Regulated Goods",
      ruleText:
        "Facebook restricts the promotion or sale of drugs, alcohol, and tobacco, particularly content that could reach minors.",
      severity: "heads-up",
    },
    youtube: {
      ruleTitle: "Age-restricted content policy",
      ruleText:
        "YouTube age-restricts content that shows the consumption of drugs, alcohol, or tobacco in a way that could encourage imitation by minors.",
      severity: "heads-up",
    },
    snapchat: {
      ruleTitle: "Drugs and Alcohol",
      ruleText:
        "Snapchat prohibits content that promotes the illegal use of drugs or excessive consumption of alcohol.",
      severity: "heads-up",
    },
  },
  dangerous_activities: {
    tiktok: {
      ruleTitle: "Dangerous Acts and Challenges",
      ruleText:
        "TikTok removes content that depicts, promotes, or instructs dangerous acts or challenges that could lead to injury.",
      severity: "heads-up",
    },
    youtube: {
      ruleTitle: "Harmful or dangerous content policy",
      ruleText:
        "YouTube doesn't allow content that encourages dangerous or illegal activities that risk serious physical harm.",
      severity: "heads-up",
    },
    instagram: {
      ruleTitle: "Regulated Goods and Dangerous Activities",
      ruleText:
        "Instagram removes content that promotes or depicts dangerous stunts or activities that could lead to serious injury.",
      severity: "heads-up",
    },
    snapchat: {
      ruleTitle: "Dangerous Activities",
      ruleText:
        "Snapchat prohibits content that depicts or encourages dangerous activities likely to cause serious physical harm.",
      severity: "heads-up",
    },
  },
  harassment_bullying: {
    instagram: {
      ruleTitle: "Bullying and Harassment",
      ruleText:
        "Instagram doesn't allow content that targets private individuals with intent to degrade, shame, or bully them.",
      severity: "heads-up",
    },
    facebook: {
      ruleTitle: "Bullying and Harassment",
      ruleText:
        "Facebook removes content that's meant to degrade or shame private individuals.",
      severity: "heads-up",
    },
    x: {
      ruleTitle: "Abuse and Harassment policy",
      ruleText:
        "X prohibits targeted harassment of individuals or inciting others to do so.",
      severity: "heads-up",
    },
    tiktok: {
      ruleTitle: "Harassment and Bullying",
      ruleText:
        "TikTok prohibits content that harasses, shames, or bullies a private individual.",
      severity: "heads-up",
    },
    reddit: {
      ruleTitle: "Harassment policy",
      ruleText:
        "Reddit prohibits harassing individuals or inciting others to do so.",
      severity: "heads-up",
    },
  },
};

// Imagine's own baseline content guidelines, independent of any platform.
const IMAGINE_RULES: Record<ContentCategory, RuleEntry> = {
  nudity_sexual_content: {
    ruleTitle: "Imagine Content Guidelines — Sexual Content",
    ruleText:
      "Imagine isn't intended for generating captions or posts around sexually explicit imagery.",
    severity: "likely-violation",
  },
  graphic_violence: {
    ruleTitle: "Imagine Content Guidelines — Graphic Violence",
    ruleText:
      "Imagine asks users to avoid using the app to caption or promote graphic real-world violence.",
    severity: "heads-up",
  },
  hate_speech: {
    ruleTitle: "Imagine Content Guidelines — Hate Speech",
    ruleText:
      "Imagine doesn't support generating content that attacks people based on protected characteristics.",
    severity: "likely-violation",
  },
  copyrighted_material: {
    ruleTitle: "Imagine Content Guidelines — Respect Ownership",
    ruleText:
      "Imagine encourages only posting media you own or have rights to use.",
    severity: "heads-up",
  },
  age_restricted_substances: {
    ruleTitle: "Imagine Content Guidelines — Age-Restricted Content",
    ruleText:
      "Imagine asks users to be mindful when depicting drugs, alcohol, or tobacco, especially content that could reach minors.",
    severity: "heads-up",
  },
  dangerous_activities: {
    ruleTitle: "Imagine Content Guidelines — Safety",
    ruleText:
      "Imagine discourages promoting dangerous stunts or activities that could cause real harm if imitated.",
    severity: "heads-up",
  },
  harassment_bullying: {
    ruleTitle: "Imagine Content Guidelines — Respectful Use",
    ruleText:
      "Imagine asks users not to use generated content to shame, bully, or harass private individuals.",
    severity: "heads-up",
  },
};

export function buildPolicyFlags(
  categories: ContentCategory[],
  source: "image" | "text"
): PolicyFlag[] {
  const flags: PolicyFlag[] = [];

  for (const category of categories) {
    const platformRules = KB[category];
    for (const [platform, rule] of Object.entries(platformRules)) {
      flags.push({
        category,
        platform: platform as PolicyPlatform,
        platformLabel: PLATFORM_LABELS[platform as PolicyPlatform],
        ruleTitle: rule.ruleTitle,
        ruleText: rule.ruleText,
        severity: rule.severity,
        source,
      });
    }

    const imagineRule = IMAGINE_RULES[category];
    flags.push({
      category,
      platform: "imagine",
      platformLabel: "Imagine",
      ruleTitle: imagineRule.ruleTitle,
      ruleText: imagineRule.ruleText,
      severity: imagineRule.severity,
      source,
    });
  }

  return flags;
}
