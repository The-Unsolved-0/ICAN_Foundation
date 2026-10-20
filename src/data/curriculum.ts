export type Chapter = {
  id: string;
  number: number;
  title: string;
  page: number;
  pages: number;
};

export type Strand = {
  id: string;
  title: string;
  blurb: string;
  chapters: Chapter[];
};

export type Subject = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  strands: Strand[];
};

function seq(prefix: string, rows: [number, string, number, number][]): Chapter[] {
  return rows.map(([number, title, page, pages]) => ({
    id: `${prefix}-${number}`,
    number,
    title,
    page,
    pages,
  }));
}

export const subjects: Subject[] = [
  {
    id: "accounting",
    title: "Accounting",
    kicker: "01",
    summary: "Financial accounting through chapter 11, then costing, overheads, budgets and cash.",
    strands: [
      {
        id: "acc-fa",
        title: "Financial accounting",
        blurb: "Chapters 1–11 · the equation through the extended trial balance",
        chapters: seq("acc", [
          [1, "Introduction to accounting", 1, 26],
          [2, "The accounting equation", 27, 32],
          [3, "Recording financial transactions", 59, 20],
          [4, "Ledger accounting and double entry", 79, 38],
          [5, "Preparing basic financial statements", 117, 26],
          [6, "Cost of sales and inventories", 143, 34],
          [7, "Receivables and irrecoverable debts", 177, 20],
          [8, "Accruals and prepayments", 197, 26],
          [9, "Non-current assets and depreciation", 223, 36],
          [10, "Errors, omissions and reconciliations", 259, 34],
          [11, "The extended trial balance", 293, 28],
        ]),
      },
      {
        id: "acc-cost",
        title: "Cost accounting",
        blurb: "Chapters 12–19 · materials, overheads, costing methods and budgets",
        chapters: seq("acc", [
          [12, "Cost accounting concepts", 321, 24],
          [13, "Accounting for materials and labour", 345, 24],
          [14, "Accounting for overheads", 369, 12],
          [15, "The treatment of overheads: absorption costing", 381, 28],
          [16, "The treatment of overheads: marginal costing", 409, 28],
          [17, "Costing methods", 437, 20],
          [18, "Budgets and forecasts", 457, 30],
          [19, "Cash budgets", 487, 14],
        ]),
      },
    ],
  },
  {
    id: "business",
    title: "Business and finance",
    kicker: "02",
    summary: "Business, finance, governance, economics, then data and digital technology.",
    strands: [
      {
        id: "bf-bus",
        title: "Business",
        blurb: "Chapters 1–4 · the firm, leadership, planning and organisations",
        chapters: seq("bf", [
          [1, "Introduction to business", 1, 38],
          [2, "Management and leadership", 39, 32],
          [3, "Introduction to business planning, risk management and crisis management", 71, 52],
          [4, "Business organisations", 123, 32],
        ]),
      },
      {
        id: "bf-fin",
        title: "Finance",
        blurb: "Chapters 5–8 · financial information, the finance function and funding",
        chapters: seq("bf", [
          [5, "Financial information", 155, 28],
          [6, "Information and the finance function", 183, 34],
          [7, "Sources of business finance", 217, 32],
          [8, "The accountancy profession", 249, 22],
        ]),
      },
      {
        id: "bf-gov",
        title: "Governance",
        blurb: "Chapters 9–10 · governance and promoting good governance",
        chapters: seq("bf", [
          [9, "Governance", 271, 20],
          [10, "Promoting good governance", 291, 18],
        ]),
      },
      {
        id: "bf-eco",
        title: "Economics",
        blurb: "Chapters 11–12 · microeconomics and macroeconomics",
        chapters: seq("bf", [
          [11, "Principles of microeconomics", 309, 38],
          [12, "Principles of macroeconomics", 347, 22],
        ]),
      },
      {
        id: "bf-is",
        title: "Information system",
        blurb: "Chapters 13–14 · business data, risk and digital technology",
        chapters: seq("bf", [
          [13, "Business data", 369, 24],
          [14, "Data management, data risk management and digital technology", 393, 26],
        ]),
      },
    ],
  },
  {
    id: "assurance",
    title: "Assurance and Information System",
    kicker: "03",
    summary: "Assurance and ethics first, then management systems, fintech and data security.",
    strands: [
      {
        id: "ais-ass",
        title: "Assurance (audit)",
        blurb: "Chapters 1–6 · the engagement, ethics and confidentiality",
        chapters: seq("ais", [
          [1, "The concept of assurance", 1, 18],
          [2, "The regulatory environment", 19, 20],
          [3, "Assurance engagements", 39, 28],
          [4, "Professional ethics", 67, 14],
          [5, "Integrity, objectivity and independence", 81, 26],
          [6, "Confidentiality", 107, 12],
        ]),
      },
      {
        id: "ais-is",
        title: "Information system",
        blurb: "Chapters 7–10 · systems, financial technology and data security",
        chapters: seq("ais", [
          [7, "Management information systems", 119, 22],
          [8, "Types of management information system", 141, 30],
          [9, "Financial technology", 171, 20],
          [10, "Data security", 191, 12],
        ]),
      },
    ],
  },
  {
    id: "law",
    title: "Law and Tax",
    kicker: "04",
    summary: "Nepal’s legal framework through the Labour Act, then the tax sequence to tax audit.",
    strands: [
      {
        id: "lt-law",
        title: "Law",
        blurb: "Chapters 1–6 · legislation, the CA Act, Civil Code, industry, instruments, labour",
        chapters: seq("law", [
          [1, "Legislative process in Nepal and main elements of legal framework in Nepal", 1, 23],
          [2, "Nepal Chartered Accountants Act, 2053", 24, 16],
          [3, "The National Civil (Code), 2074 (Part V)", 40, 172],
          [4, "Industrial Laws", 212, 48],
          [5, "Negotiable Instruments and its uses in Nepal", 260, 14],
          [6, "The Labor Act, 2074", 274, 22],
        ]),
      },
      {
        id: "lt-tax",
        title: "Tax",
        blurb: "Chapters 7–13 · sources, avoidance, administration, returns and tax audit",
        chapters: seq("law", [
          [7, "Source of tax laws and its types", 296, 28],
          [8, "Process of development and amendment in taxation laws", 324, 21],
          [9, "Tax planning, tax mitigation, tax avoidance and tax evasion", 345, 9],
          [10, "Process of taxpayers’ identification and tax administration", 354, 35],
          [11, "Basis of taxation and exemptions from tax", 389, 20],
          [12, "Tax period and return filings", 409, 25],
          [13, "Tax audit services", 434, 9],
        ]),
      },
    ],
  },
];

export type Located = {
  subject: Subject;
  strand: Strand;
  chapter: Chapter;
  index: number;
};

export function flatChapters(): Located[] {
  const out: Located[] = [];
  for (const subject of subjects) {
    for (const strand of subject.strands) {
      strand.chapters.forEach((chapter, index) => {
        out.push({ subject, strand, chapter, index });
      });
    }
  }
  return out;
}

const located = new Map(flatChapters().map((row) => [row.chapter.id, row]));

export function locate(id: string): Located | null {
  return located.get(id) ?? null;
}

export function nextInStrand(id: string): string | null {
  const row = locate(id);
  if (!row) return null;
  return row.strand.chapters[row.index + 1]?.id ?? null;
}

export const chapterCount = flatChapters().length;

export function subjectChapters(subject: Subject): Chapter[] {
  return subject.strands.flatMap((strand) => strand.chapters);
}
