import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  Shield,
  PoundSterling,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  Input, 
  Button, 
  Badge, 
  getStatusVariant, 
  Avatar,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { debounce, formatCurrency, statusLabels } from '@/lib/utils';
import type { Candidate, CandidateFilters, CandidateStatus, RightToWork, SecurityVetting } from '@/types';

// Mock data for demonstration
const mockCandidates: Candidate[] = [
  {
    id: '1',
    first_name: 'Sarah',
    last_name: 'Chen',
    email: 'sarah.chen@email.com',
    phone: '+44 7700 900123',
    location: 'London',
    linkedin_url: null,
    current_role: 'Senior Software Engineer',
    current_company: 'TechCorp Ltd',
    years_experience: 8,
    degree: 'MSc Computer Science',
    summary: 'Full-stack developer with expertise in cloud architecture and microservices.',
    skills: ['Python', 'AWS', 'Kubernetes', 'React', 'PostgreSQL', 'Docker'],
    right_to_work: 'british_citizen',
    security_vetting: 'sc',
    open_to_relocate: true,
    relocation_preferences: 'Manchester, Edinburgh',
    current_salary: 85000,
    salary_expectation_min: 95000,
    salary_expectation_max: 110000,
    salary_currency: 'GBP',
    sector_flexibility: 'Defence, Finance, Healthcare',
    scope_flexibility: 'Backend, Full-stack, Architecture',
    status: 'technical_interview',
    source: 'LinkedIn',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    first_name: 'James',
    last_name: 'Wilson',
    email: 'james.wilson@email.com',
    phone: '+44 7700 900456',
    location: 'Manchester',
    linkedin_url: null,
    current_role: 'DevOps Lead',
    current_company: 'CloudSystems',
    years_experience: 10,
    degree: 'BEng Software Engineering',
    summary: 'DevOps specialist with strong background in CI/CD and infrastructure automation.',
    skills: ['Terraform', 'AWS', 'Azure', 'Jenkins', 'Ansible', 'Linux'],
    right_to_work: 'settled_status',
    security_vetting: 'bpss',
    open_to_relocate: false,
    relocation_preferences: null,
    current_salary: 75000,
    salary_expectation_min: 85000,
    salary_expectation_max: 95000,
    salary_currency: 'GBP',
    sector_flexibility: 'Any',
    scope_flexibility: 'DevOps, SRE, Platform Engineering',
    status: 'phone_qualification',
    source: 'Referral',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    first_name: 'Priya',
    last_name: 'Patel',
    email: 'priya.patel@email.com',
    phone: '+44 7700 900789',
    location: 'Birmingham',
    linkedin_url: null,
    current_role: 'Data Engineer',
    current_company: 'DataFlow Analytics',
    years_experience: 5,
    degree: 'MSc Data Science',
    summary: 'Data engineer specialising in building scalable data pipelines and analytics platforms.',
    skills: ['Python', 'Spark', 'Airflow', 'Snowflake', 'dbt', 'SQL'],
    right_to_work: 'skilled_worker_visa',
    security_vetting: 'none',
    open_to_relocate: true,
    relocation_preferences: 'London, Remote',
    current_salary: 65000,
    salary_expectation_min: 75000,
    salary_expectation_max: 85000,
    salary_currency: 'GBP',
    sector_flexibility: 'Finance, Tech, Retail',
    scope_flexibility: 'Data Engineering, Analytics',
    status: 'new',
    source: 'Job Board',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    first_name: 'Michael',
    last_name: 'Brown',
    email: 'michael.brown@email.com',
    phone: '+44 7700 900321',
    location: 'Edinburgh',
    linkedin_url: null,
    current_role: 'Systems Architect',
    current_company: 'Defence Systems Ltd',
    years_experience: 15,
    degree: 'PhD Computer Science',
    summary: 'Experienced systems architect with deep expertise in secure, mission-critical systems.',
    skills: ['System Design', 'Security Architecture', 'C++', 'Java', 'Cloud Architecture'],
    right_to_work: 'british_citizen',
    security_vetting: 'dv',
    open_to_relocate: false,
    relocation_preferences: null,
    current_salary: 120000,
    salary_expectation_min: 130000,
    salary_expectation_max: 150000,
    salary_currency: 'GBP',
    sector_flexibility: 'Defence, Government',
    scope_flexibility: 'Architecture, Technical Leadership',
    status: 'director_interview',
    source: 'Direct Approach',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    first_name: 'Emma',
    last_name: 'Thompson',
    email: 'emma.thompson@email.com',
    phone: '+44 7700 900654',
    location: 'Bristol',
    linkedin_url: null,
    current_role: 'Frontend Developer',
    current_company: 'Digital Agency Co',
    years_experience: 4,
    degree: 'BSc Web Development',
    summary: 'Creative frontend developer with strong eye for design and UX.',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Figma'],
    right_to_work: 'british_citizen',
    security_vetting: 'none',
    open_to_relocate: true,
    relocation_preferences: 'London, Remote',
    current_salary: 55000,
    salary_expectation_min: 65000,
    salary_expectation_max: 75000,
    salary_currency: 'GBP',
    sector_flexibility: 'Tech, Media, E-commerce',
    scope_flexibility: 'Frontend, Full-stack',
    status: 'hired',
    source: 'LinkedIn',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'phone_qualification', label: 'Phone Qualification' },
  { value: 'technical_interview', label: 'Technical Interview' },
  { value: 'director_interview', label: 'Director Interview' },
  { value: 'offer', label: 'Offer Stage' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
];

const rightToWorkOptions = [
  { value: 'british_citizen', label: 'British Citizen' },
  { value: 'settled_status', label: 'Settled Status' },
  { value: 'pre_settled_status', label: 'Pre-settled Status' },
  { value: 'skilled_worker_visa', label: 'Skilled Worker Visa' },
  { value: 'graduate_visa', label: 'Graduate Visa' },
  { value: 'requires_sponsorship', label: 'Requires Sponsorship' },
];

const securityOptions = [
  { value: 'none', label: 'None' },
  { value: 'bpss', label: 'BPSS' },
  { value: 'ctc', label: 'CTC' },
  { value: 'sc', label: 'SC' },
  { value: 'dv', label: 'DV' },
];

export function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<CandidateFilters>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Debounced search
  const performSearch = useCallback(
    debounce((query: string, currentFilters: CandidateFilters) => {
      setIsLoading(true);
      setHasSearched(true);
      
      // Simulate API call with filtering
      setTimeout(() => {
        let filtered = [...mockCandidates];
        
        // Text search
        if (query) {
          const lowerQuery = query.toLowerCase();
          filtered = filtered.filter(c => 
            c.first_name.toLowerCase().includes(lowerQuery) ||
            c.last_name.toLowerCase().includes(lowerQuery) ||
            c.current_role?.toLowerCase().includes(lowerQuery) ||
            c.skills.some(s => s.toLowerCase().includes(lowerQuery)) ||
            c.summary?.toLowerCase().includes(lowerQuery) ||
            c.location?.toLowerCase().includes(lowerQuery)
          );
        }
        
        // Status filter
        if (currentFilters.status && currentFilters.status.length > 0) {
          filtered = filtered.filter(c => currentFilters.status?.includes(c.status));
        }
        
        // Experience filter
        if (currentFilters.experience_min !== undefined) {
          filtered = filtered.filter(c => (c.years_experience || 0) >= (currentFilters.experience_min || 0));
        }
        if (currentFilters.experience_max !== undefined) {
          filtered = filtered.filter(c => (c.years_experience || 0) <= (currentFilters.experience_max || 100));
        }
        
        // Right to work filter
        if (currentFilters.right_to_work && currentFilters.right_to_work.length > 0) {
          filtered = filtered.filter(c => currentFilters.right_to_work?.includes(c.right_to_work));
        }
        
        // Security vetting filter
        if (currentFilters.security_vetting && currentFilters.security_vetting.length > 0) {
          filtered = filtered.filter(c => currentFilters.security_vetting?.includes(c.security_vetting));
        }
        
        // Salary filter
        if (currentFilters.salary_min !== undefined) {
          filtered = filtered.filter(c => (c.salary_expectation_min || 0) >= (currentFilters.salary_min || 0));
        }
        if (currentFilters.salary_max !== undefined) {
          filtered = filtered.filter(c => (c.salary_expectation_max || 999999) <= (currentFilters.salary_max || 999999));
        }
        
        // Skills filter
        if (selectedSkills.length > 0) {
          filtered = filtered.filter(c => 
            selectedSkills.some(skill => 
              c.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
            )
          );
        }
        
        setResults(filtered);
        setIsLoading(false);
      }, 300);
    }, 300),
    [selectedSkills]
  );

  // Trigger search when query or filters change
  useEffect(() => {
    if (searchQuery || Object.keys(filters).length > 0 || selectedSkills.length > 0) {
      performSearch(searchQuery, filters);
    }
  }, [searchQuery, filters, selectedSkills, performSearch]);

  const clearFilters = () => {
    setFilters({});
    setSelectedSkills([]);
  };

  const activeFilterCount = 
    (filters.status?.length || 0) +
    (filters.right_to_work?.length || 0) +
    (filters.security_vetting?.length || 0) +
    (filters.experience_min !== undefined ? 1 : 0) +
    (filters.salary_min !== undefined || filters.salary_max !== undefined ? 1 : 0) +
    selectedSkills.length;

  return (
    <div className="min-h-screen">
      <Header 
        title="Search Candidates"
        subtitle="Find the right engineer for your requirements"
      />

      <div className="p-6 space-y-6">
        {/* Search Bar */}
        <Card>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-grey-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, skills, role, location..."
                className="w-full pl-12 pr-4 py-3 text-lg rounded-lg border border-brand-grey-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan transition-all"
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-brand-cyan text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="accent"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => {/* TODO: AI search */}}
            >
              AI Search
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-brand-grey-200/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-brand-slate-900">Filters</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    multiple
                    value={filters.status || []}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value as CandidateStatus);
                      setFilters(f => ({ ...f, status: values.length > 0 ? values : undefined }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-brand-grey-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 h-24"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                    Experience (years)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.experience_min || ''}
                      onChange={(e) => setFilters(f => ({ 
                        ...f, 
                        experience_min: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.experience_max || ''}
                      onChange={(e) => setFilters(f => ({ 
                        ...f, 
                        experience_max: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                </div>

                {/* Right to Work */}
                <div>
                  <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                    Right to Work
                  </label>
                  <select
                    multiple
                    value={filters.right_to_work || []}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value as RightToWork);
                      setFilters(f => ({ ...f, right_to_work: values.length > 0 ? values : undefined }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-brand-grey-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 h-24"
                  >
                    {rightToWorkOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Security Vetting */}
                <div>
                  <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                    Security Clearance
                  </label>
                  <select
                    multiple
                    value={filters.security_vetting || []}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value as SecurityVetting);
                      setFilters(f => ({ ...f, security_vetting: values.length > 0 ? values : undefined }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-brand-grey-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 h-24"
                  >
                    {securityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Salary Range */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                    Salary Expectation (£)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min salary"
                      value={filters.salary_min || ''}
                      onChange={(e) => setFilters(f => ({ 
                        ...f, 
                        salary_min: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max salary"
                      value={filters.salary_max || ''}
                      onChange={(e) => setFilters(f => ({ 
                        ...f, 
                        salary_max: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                </div>

                {/* Skills */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                    Skills
                  </label>
                  <Input
                    placeholder="Type skills separated by comma (e.g., Python, AWS, React)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value) {
                          const newSkills = value.split(',').map(s => s.trim()).filter(s => s);
                          setSelectedSkills([...new Set([...selectedSkills, ...newSkills])]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSkills.map(skill => (
                        <Badge key={skill} variant="cyan">
                          {skill}
                          <button
                            onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))}
                            className="ml-1.5 hover:text-cyan-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="No candidates found"
              description="Try adjusting your search terms or filters to find what you're looking for."
            />
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-brand-grey-400">
                Found {results.length} candidate{results.length !== 1 ? 's' : ''}
              </p>
              {results.map(candidate => (
                <CandidateCard 
                  key={candidate.id} 
                  candidate={candidate}
                  onClick={() => navigate(`/candidates/${candidate.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="Search your candidate database"
              description="Enter a search term or use filters to find candidates in your database."
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Candidate Card Component
interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
}

function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card hover onClick={onClick} className="cursor-pointer">
      <div className="flex gap-4">
        <Avatar 
          name={`${candidate.first_name} ${candidate.last_name}`}
          size="lg"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-brand-slate-900">
                {candidate.first_name} {candidate.last_name}
              </h3>
              <p className="text-brand-grey-400">
                {candidate.current_role} {candidate.current_company && `at ${candidate.current_company}`}
              </p>
            </div>
            <Badge variant={getStatusVariant(candidate.status)}>
              {statusLabels[candidate.status]}
            </Badge>
          </div>

          {/* Key Info Row */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-brand-slate-700">
            {candidate.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-brand-grey-400" />
                {candidate.location}
              </span>
            )}
            {candidate.years_experience && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4 text-brand-grey-400" />
                {candidate.years_experience} years
              </span>
            )}
            {candidate.degree && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4 text-brand-grey-400" />
                {candidate.degree}
              </span>
            )}
            {candidate.security_vetting !== 'none' && (
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-brand-grey-400" />
                {statusLabels[candidate.security_vetting]}
              </span>
            )}
            {candidate.salary_expectation_min && (
              <span className="flex items-center gap-1">
                <PoundSterling className="h-4 w-4 text-brand-grey-400" />
                {formatCurrency(candidate.salary_expectation_min)} - {formatCurrency(candidate.salary_expectation_max || 0)}
              </span>
            )}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {candidate.skills.slice(0, isExpanded ? undefined : 5).map(skill => (
              <Badge key={skill} variant="grey" size="sm">
                {skill}
              </Badge>
            ))}
            {!isExpanded && candidate.skills.length > 5 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="text-xs text-brand-cyan hover:underline"
              >
                +{candidate.skills.length - 5} more
              </button>
            )}
          </div>

          {/* Summary */}
          {candidate.summary && (
            <p className="mt-3 text-sm text-brand-grey-400 line-clamp-2">
              {candidate.summary}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
