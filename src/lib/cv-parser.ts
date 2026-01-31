// CV Parser Utility
// Extracts structured data from CV text

export interface ParsedCV {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  skills: string[];
  previousCompanies: string[];
  yearsExperience: number | null;
  degree: string;
  summary: string;
  jobTitles: string[];
  rawText: string;
}

// Common skills in nuclear/engineering industry
const KNOWN_SKILLS = [
  // Nuclear specific
  'Nuclear Engineering', 'Reactor Physics', 'Nuclear Safety', 'Radiation Protection',
  'Decommissioning', 'Waste Management', 'Criticality Safety', 'Shielding',
  'MCNP', 'SCALE', 'SERPENT', 'ANSWERS', 'WIMS', 'MONK', 'PANTHER',
  'Nuclear Fuel', 'Thermal Hydraulics', 'Neutronics', 'Dosimetry',
  'GDA', 'ONR', 'NII', 'ALARP', 'HAZOP', 'PSA', 'PRA',
  // Engineering
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Process Engineering', 'Control Systems',
  'Instrumentation', 'HVAC', 'Piping', 'Structural Analysis',
  'FEA', 'CFD', 'CAD', 'AutoCAD', 'SolidWorks', 'CATIA', 'NX',
  'ANSYS', 'ABAQUS', 'COMSOL', 'MATLAB', 'Simulink',
  // Project/Management
  'Project Management', 'Programme Management', 'Risk Management',
  'Quality Assurance', 'Quality Control', 'Configuration Management',
  'Requirements Management', 'Systems Engineering', 'V&V',
  'PRINCE2', 'PMP', 'Agile', 'Scrum', 'Lean', 'Six Sigma',
  // Software
  'Python', 'C++', 'Java', 'JavaScript', 'SQL', 'R',
  'Microsoft Office', 'Excel', 'VBA', 'Power BI', 'Tableau',
  // Certifications/Standards
  'ISO 9001', 'ISO 14001', 'ISO 45001', 'IEC 61508', 'IEC 61511',
  'ASME', 'IEEE', 'BS EN', 'CDM', 'COMAH',
  // Soft skills
  'Leadership', 'Team Management', 'Stakeholder Management',
  'Technical Writing', 'Report Writing', 'Presentation Skills',
];

// Known companies in nuclear industry
const KNOWN_COMPANIES = [
  'EDF', 'EDF Energy', 'Rolls-Royce', 'Rolls Royce', 'BAE Systems', 'BAE',
  'Sellafield', 'Sellafield Ltd', 'NDA', 'Nuclear Decommissioning Authority',
  'AWE', 'Atomic Weapons Establishment', 'Jacobs', 'Wood', 'Wood Group',
  'Atkins', 'WSP', 'Mott MacDonald', 'Arup', 'Assystem', 'Framatome',
  'Westinghouse', 'GE Hitachi', 'Hitachi', 'Cavendish Nuclear',
  'Babcock', 'Magnox', 'NNB', 'Hinkley Point', 'Sizewell',
  'UKAEA', 'UK Atomic Energy Authority', 'National Nuclear Laboratory', 'NNL',
  'Dounreay', 'Springfields', 'Capenhurst', 'Urenco',
  'Nuvia', 'Orano', 'TÜV', 'Lloyd\'s Register', 'DNV',
];

// Job titles
const JOB_TITLE_PATTERNS = [
  /(?:Senior |Lead |Principal |Chief |Head of |Director of )?(?:Nuclear |Reactor |Safety |Design |Process |Project |Programme |Quality |Systems? )?Engineer(?:ing)?/gi,
  /(?:Senior |Lead |Principal )?(?:Project |Programme |Technical |Engineering |Operations )?Manager/gi,
  /(?:Senior |Lead |Principal )?(?:Nuclear |Safety |Technical |Design )?Consultant/gi,
  /(?:Senior |Lead |Principal )?(?:Nuclear |Reactor )?Physicist/gi,
  /(?:Senior |Lead |Principal )?Analyst/gi,
  /(?:Technical |Engineering )?Director/gi,
  /(?:Head of |Director of )(?:Engineering|Safety|Projects|Operations)/gi,
];

// Extract email
function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : '';
}

// Extract phone number (UK formats)
function extractPhone(text: string): string {
  const phonePatterns = [
    /(?:\+44|0044|0)[\s.-]?7[\d]{3}[\s.-]?[\d]{3}[\s.-]?[\d]{3}/g, // Mobile
    /(?:\+44|0044|0)[\s.-]?[1-9][\d]{2,4}[\s.-]?[\d]{3,4}[\s.-]?[\d]{3,4}/g, // Landline
    /\(?\d{4,5}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, // General
  ];
  
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      return matches[0].replace(/[\s.-]/g, ' ').trim();
    }
  }
  return '';
}

// Extract LinkedIn URL
function extractLinkedIn(text: string): string {
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/gi;
  const matches = text.match(linkedinRegex);
  if (matches) {
    let url = matches[0];
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    return url;
  }
  return '';
}

// Extract location (UK cities and regions)
function extractLocation(text: string): string {
  const ukLocations = [
    'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool',
    'Bristol', 'Sheffield', 'Edinburgh', 'Cardiff', 'Belfast', 'Newcastle',
    'Nottingham', 'Southampton', 'Leicester', 'Coventry', 'Bradford',
    'Reading', 'Kingston upon Hull', 'Preston', 'Stoke-on-Trent',
    'Wolverhampton', 'Derby', 'Swansea', 'Plymouth', 'Oxford', 'Cambridge',
    'Milton Keynes', 'Swindon', 'Warrington', 'Gloucester', 'Exeter',
    'Bath', 'York', 'Aberdeen', 'Dundee', 'Inverness',
    // Nuclear site locations
    'Bridgwater', 'Taunton', 'Cumbria', 'Whitehaven', 'Workington',
    'Barrow-in-Furness', 'Barrow', 'Warrington', 'Risley', 'Birchwood',
    'Thurso', 'Wick', 'Gloucester', 'Berkeley', 'Oldbury',
  ];
  
  const textLower = text.toLowerCase();
  for (const location of ukLocations) {
    if (textLower.includes(location.toLowerCase())) {
      return location;
    }
  }
  
  // Try to find postcode area
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b/gi;
  const postcodeMatch = text.match(postcodeRegex);
  if (postcodeMatch) {
    return postcodeMatch[0];
  }
  
  return '';
}

// Extract name (usually at the top of CV)
function extractName(text: string): { firstName: string; lastName: string } {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // First few non-empty lines likely contain the name
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip lines that look like headers, contact info, or titles
    if (line.match(/^(curriculum vitae|cv|resume|profile|summary|contact|email|phone|address|linkedin)/i)) {
      continue;
    }
    if (line.includes('@') || line.match(/\d{5,}/)) {
      continue;
    }
    
    // Look for a name pattern (2-4 words, starting with capitals)
    const words = line.split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 2 && words.length <= 4) {
      const allCapitalized = words.every(w => /^[A-Z]/.test(w));
      if (allCapitalized) {
        return {
          firstName: words[0],
          lastName: words.slice(1).join(' '),
        };
      }
    }
  }
  
  return { firstName: '', lastName: '' };
}

// Extract skills
function extractSkills(text: string): string[] {
  const foundSkills: string[] = [];
  const textLower = text.toLowerCase();
  
  for (const skill of KNOWN_SKILLS) {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  
  return [...new Set(foundSkills)];
}

// Extract companies
function extractCompanies(text: string): string[] {
  const foundCompanies: string[] = [];
  
  for (const company of KNOWN_COMPANIES) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      foundCompanies.push(company);
    }
  }
  
  return [...new Set(foundCompanies)];
}

// Extract years of experience
function extractYearsExperience(text: string): number | null {
  // Look for patterns like "10+ years", "over 15 years", "5 years experience"
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i,
    /(?:over|more than)\s*(\d+)\s*years?/i,
    /(\d+)\s*years?\s*(?:in|of|working)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Try to calculate from date ranges
  const yearPattern = /(?:19|20)\d{2}/g;
  const years = text.match(yearPattern);
  if (years && years.length >= 2) {
    const numericYears = years.map(y => parseInt(y, 10)).sort((a, b) => a - b);
    const experience = numericYears[numericYears.length - 1] - numericYears[0];
    if (experience > 0 && experience < 50) {
      return experience;
    }
  }
  
  return null;
}

// Extract degree/education
function extractDegree(text: string): string {
  const degreePatterns = [
    /(?:PhD|Ph\.D|Doctorate|Doctor of Philosophy)(?:\s+in\s+[A-Za-z\s]+)?/i,
    /(?:MSc|M\.Sc|Master(?:'s)?(?:\s+of\s+Science)?)(?:\s+in\s+[A-Za-z\s]+)?/i,
    /(?:MEng|M\.Eng|Master(?:'s)?(?:\s+of\s+Engineering)?)(?:\s+in\s+[A-Za-z\s]+)?/i,
    /(?:MBA|Master(?:'s)?(?:\s+of\s+Business Administration)?)/i,
    /(?:BSc|B\.Sc|Bachelor(?:'s)?(?:\s+of\s+Science)?)(?:\s+in\s+[A-Za-z\s]+)?/i,
    /(?:BEng|B\.Eng|Bachelor(?:'s)?(?:\s+of\s+Engineering)?)(?:\s+in\s+[A-Za-z\s]+)?/i,
    /(?:BA|B\.A|Bachelor(?:'s)?(?:\s+of\s+Arts)?)(?:\s+in\s+[A-Za-z\s]+)?/i,
    /(?:HNC|HND|BTEC|NVQ)/i,
  ];
  
  for (const pattern of degreePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return '';
}

// Extract job titles
function extractJobTitles(text: string): string[] {
  const titles: string[] = [];
  
  for (const pattern of JOB_TITLE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      titles.push(...matches.map(m => m.trim()));
    }
  }
  
  return [...new Set(titles)].slice(0, 5);
}

// Generate a brief summary from the CV
function generateSummary(text: string, skills: string[], companies: string[], jobTitles: string[]): string {
  const parts: string[] = [];
  
  if (jobTitles.length > 0) {
    parts.push(`${jobTitles[0]}`);
  }
  
  if (companies.length > 0) {
    const companyList = companies.slice(0, 3).join(', ');
    parts.push(`with experience at ${companyList}`);
  }
  
  if (skills.length > 0) {
    const skillList = skills.slice(0, 5).join(', ');
    parts.push(`Skilled in ${skillList}`);
  }
  
  return parts.join('. ') + (parts.length > 0 ? '.' : '');
}

// Main parsing function
export function parseCV(text: string): ParsedCV {
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const linkedinUrl = extractLinkedIn(text);
  const location = extractLocation(text);
  const { firstName, lastName } = extractName(text);
  const skills = extractSkills(text);
  const previousCompanies = extractCompanies(text);
  const yearsExperience = extractYearsExperience(text);
  const degree = extractDegree(text);
  const jobTitles = extractJobTitles(text);
  const summary = generateSummary(text, skills, previousCompanies, jobTitles);
  
  return {
    firstName,
    lastName,
    email,
    phone,
    location,
    linkedinUrl,
    skills,
    previousCompanies,
    yearsExperience,
    degree,
    summary,
    jobTitles,
    rawText: text,
  };
}

// Extract text from PDF using pdf.js (browser)
export async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamic import of pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker path
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

// Extract text from Word document using mammoth
export async function extractTextFromWord(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Main function to extract text from any supported file
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return extractTextFromWord(file);
  } else if (fileName.endsWith('.txt')) {
    return file.text();
  } else {
    throw new Error('Unsupported file format. Please upload PDF, Word (.docx), or text file.');
  }
}
