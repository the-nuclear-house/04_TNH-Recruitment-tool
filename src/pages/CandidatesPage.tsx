import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Upload, FileText, ChevronDown } from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  Button, 
  Input, 
  Badge, 
  getStatusVariant, 
  Avatar,
  EmptyState,
  Select,
  Modal,
  Textarea,
} from '@/components/ui';
import { formatDate, statusLabels } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { candidatesService, usersService, type DbCandidate } from '@/lib/services';
import type { CandidateStatus } from '@/types';

export function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<DbCandidate[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const permissions = usePermissions();
  const toast = useToast();

  // Column filters (multi-select)
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [locationsFilter, setLocationsFilter] = useState<string[]>([]);
  const [experienceFilter, setExperienceFilter] = useState<string>(''); // 'any', '0-2', '3-5', '5-10', '10+'
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  // Filter dropdowns open state
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Form state - only fields we can get from CV
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    assigned_recruiter_id: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [previousCompanies, setPreviousCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const validExtensions = ['.pdf', '.doc', '.docx'];
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (validTypes.includes(file.type) || hasValidExtension) {
        if (file.size <= 10 * 1024 * 1024) { // 10MB limit
          setCvFile(file);
        } else {
          toast.error('File too large', 'Please upload a file smaller than 10MB');
        }
      } else {
        toast.error('Invalid file type', 'Please upload a PDF, DOC, or DOCX file');
      }
    }
  };

  const handleSkillInputChange = (value: string) => {
    setSkillInput(value);
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      // Parse comma-separated values on Enter
      const parts = skillInput.split(',').map(s => s.trim()).filter(s => s);
      const newSkills = parts.filter(s => !skills.includes(s));
      if (newSkills.length > 0) {
        setSkills([...skills, ...newSkills]);
      }
      setSkillInput('');
    }
  };

  const handleCompanyInputChange = (value: string) => {
    setCompanyInput(value);
  };

  const handleCompanyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && companyInput.trim()) {
      e.preventDefault();
      // Parse comma-separated values on Enter
      const parts = companyInput.split(',').map(s => s.trim()).filter(s => s);
      const newCompanies = parts.filter(s => !previousCompanies.includes(s));
      if (newCompanies.length > 0) {
        setPreviousCompanies([...previousCompanies, ...newCompanies]);
      }
      setCompanyInput('');
    }
  };

  // Load candidates and users from database
  const loadCandidates = async () => {
    try {
      setIsLoadingData(true);
      const [candidatesData, usersData] = await Promise.all([
        candidatesService.getAll(),
        usersService.getAll(),
      ]);
      setCandidates(candidatesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast.error('Error', 'Failed to load candidates');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Validation Error', 'Please fill in the required fields');
      return;
    }
    setIsSubmitting(true);
    
    try {
      await candidatesService.create({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || undefined,
        location: formData.location || undefined,
        summary: formData.summary || undefined,
        skills: skills.length > 0 ? skills : undefined,
        previous_companies: previousCompanies.length > 0 ? previousCompanies : undefined,
        assigned_recruiter_id: formData.assigned_recruiter_id || undefined,
      });
      
      toast.success('Candidate Added', `${formData.first_name} ${formData.last_name} has been added to the database`);
      setIsModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: '',
        summary: '',
        assigned_recruiter_id: '',
      });
      setSkills([]);
      setPreviousCompanies([]);
      setCvFile(null);
      
      // Reload candidates
      loadCandidates();
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast.error('Error', 'Failed to create candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique values for filters
  const allSkills = [...new Set(candidates.flatMap(c => c.skills || []))].sort();
  const allLocations = [...new Set(candidates.map(c => c.location).filter(Boolean))].sort() as string[];
  const allStatuses = [...new Set(candidates.map(c => c.status))];

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    // Search filter
    const matchesSearch = !searchQuery || 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Skills filter (must have ALL selected skills)
    const matchesSkills = skillsFilter.length === 0 || 
      skillsFilter.every(skill => c.skills?.includes(skill));
    
    // Location filter (must match ONE of selected locations)
    const matchesLocation = locationsFilter.length === 0 || 
      locationsFilter.includes(c.location || '');
    
    // Experience filter
    let matchesExperience = true;
    if (experienceFilter) {
      const exp = c.years_experience || 0;
      switch (experienceFilter) {
        case '0-2': matchesExperience = exp >= 0 && exp <= 2; break;
        case '3-5': matchesExperience = exp >= 3 && exp <= 5; break;
        case '5-10': matchesExperience = exp > 5 && exp <= 10; break;
        case '10+': matchesExperience = exp > 10; break;
      }
    }
    
    // Status filter
    const matchesStatus = statusFilter.length === 0 || 
      statusFilter.includes(c.status);
    
    return matchesSearch && matchesSkills && matchesLocation && matchesExperience && matchesStatus;
  });

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSkillsFilter([]);
    setLocationsFilter([]);
    setExperienceFilter('');
    setStatusFilter([]);
    setAiSearchExplanation('');
  };

  const hasActiveFilters = searchQuery || skillsFilter.length > 0 || locationsFilter.length > 0 || experienceFilter || statusFilter.length > 0;

  // Column filter dropdown component
  const ColumnFilter = ({ 
    column, 
    options, 
    selected, 
    onChange,
    type = 'multi'
  }: { 
    column: string; 
    options: string[]; 
    selected: string[] | string;
    onChange: (value: any) => void;
    type?: 'multi' | 'single';
  }) => {
    const isOpen = openFilter === column;
    const hasFilter = type === 'multi' ? (selected as string[]).length > 0 : !!selected;
    
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenFilter(isOpen ? null : column);
          }}
          className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
            hasFilter ? 'text-brand-cyan' : 'text-brand-grey-400 hover:text-brand-slate-700'
          }`}
        >
          {column}
          {hasFilter && <span className="bg-brand-cyan text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
            {type === 'multi' ? (selected as string[]).length : '1'}
          </span>}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-brand-grey-200 z-20 min-w-[180px] max-h-[300px] overflow-y-auto">
            {type === 'multi' ? (
              <>
                <div className="p-2 border-b border-brand-grey-100">
                  <button
                    onClick={() => onChange([])}
                    className="text-xs text-brand-grey-400 hover:text-brand-cyan"
                  >
                    Clear all
                  </button>
                </div>
                {options.map(option => (
                  <label 
                    key={option} 
                    className="flex items-center gap-2 px-3 py-2 hover:bg-brand-grey-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(selected as string[]).includes(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange([...(selected as string[]), option]);
                        } else {
                          onChange((selected as string[]).filter(s => s !== option));
                        }
                      }}
                      className="rounded border-brand-grey-300 text-brand-cyan focus:ring-brand-cyan"
                    />
                    <span className="text-sm text-brand-slate-700">{option}</span>
                  </label>
                ))}
              </>
            ) : (
              <>
                <div className="p-2 border-b border-brand-grey-100">
                  <button
                    onClick={() => onChange('')}
                    className="text-xs text-brand-grey-400 hover:text-brand-cyan"
                  >
                    Clear
                  </button>
                </div>
                {options.map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      onChange(option);
                      setOpenFilter(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-grey-50 ${
                      selected === option ? 'bg-brand-cyan/10 text-brand-cyan' : 'text-brand-slate-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Candidates"
        subtitle={`${filteredCandidates.length} of ${candidates.length} candidates`}
        actions={
          permissions.canAddCandidates ? (
            <Button 
              variant="success"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Add Candidate
            </Button>
          ) : null
        }
      />

      <div className="p-6 space-y-6" ref={filterRef}>
        {/* Search Bar */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                isSearch
                placeholder="Search by name, email, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearAllFilters}
                leftIcon={<X className="h-4 w-4" />}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Candidates Table */}
        {isLoadingData ? (
          <Card>
            <div className="text-center py-8 text-brand-grey-400">
              Loading candidates...
            </div>
          </Card>
        ) : filteredCandidates.length === 0 ? (
          <EmptyState
            title="No candidates found"
            description={candidates.length === 0 ? "Add your first candidate to get started." : "Try adjusting your filters."}
            action={{
              label: 'Add Candidate',
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-xs font-medium uppercase tracking-wider text-brand-grey-400">
                    Candidate
                  </th>
                  <th>
                    <ColumnFilter
                      column="Skills"
                      options={allSkills}
                      selected={skillsFilter}
                      onChange={setSkillsFilter}
                      type="multi"
                    />
                  </th>
                  <th>
                    <ColumnFilter
                      column="Location"
                      options={allLocations}
                      selected={locationsFilter}
                      onChange={setLocationsFilter}
                      type="multi"
                    />
                  </th>
                  <th>
                    <ColumnFilter
                      column="Experience"
                      options={['0-2 yrs', '3-5 yrs', '5-10 yrs', '10+ yrs']}
                      selected={experienceFilter ? `${experienceFilter} yrs` : ''}
                      onChange={(v: string) => setExperienceFilter(v.replace(' yrs', ''))}
                      type="single"
                    />
                  </th>
                  <th className="text-xs font-medium uppercase tracking-wider text-brand-grey-400">
                    Min Salary
                  </th>
                  <th>
                    <ColumnFilter
                      column="Status"
                      options={allStatuses.map(s => statusLabels[s as CandidateStatus] || s)}
                      selected={statusFilter.map(s => statusLabels[s as CandidateStatus] || s)}
                      onChange={(labels: string[]) => {
                        // Convert labels back to status values
                        const statusValues = labels.map(label => {
                          const entry = Object.entries(statusLabels).find(([, v]) => v === label);
                          return entry ? entry[0] : label;
                        });
                        setStatusFilter(statusValues);
                      }}
                      type="multi"
                    />
                  </th>
                  <th className="text-xs font-medium uppercase tracking-wider text-brand-grey-400">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr 
                    key={candidate.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar 
                          name={`${candidate.first_name} ${candidate.last_name}`}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-brand-slate-900">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          <p className="text-sm text-brand-grey-400">
                            {candidate.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills?.map(skill => (
                          <Badge key={skill} variant="cyan" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="text-brand-slate-700">{candidate.location || '-'}</td>
                    <td className="text-brand-slate-700">{candidate.years_experience ? `${candidate.years_experience} yrs` : '-'}</td>
                    <td className="text-brand-slate-700">
                      {candidate.minimum_salary_expected ? `£${candidate.minimum_salary_expected.toLocaleString()}` : '-'}
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(candidate.status as CandidateStatus)}>
                        {statusLabels[candidate.status as CandidateStatus] || candidate.status}
                      </Badge>
                    </td>
                    <td className="text-brand-grey-400 text-sm">
                      {formatDate(candidate.created_at)}
                    </td>
                    <td>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Candidate Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Candidate"
        description="Enter the candidate's information"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => handleFormChange('first_name', e.target.value)}
              placeholder="John"
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => handleFormChange('last_name', e.target.value)}
              placeholder="Smith"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              placeholder="john.smith@email.com"
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
              placeholder="+44 7700 900000"
            />
          </div>

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => handleFormChange('location', e.target.value)}
            placeholder="London"
          />

          {/* CV Upload */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              CV / Resume
            </label>
            <div 
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-all
                ${isDragging 
                  ? 'border-brand-cyan bg-brand-cyan/5' 
                  : cvFile 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-brand-grey-200 hover:border-brand-cyan'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                className="hidden"
                id="cv-upload"
              />
              <label htmlFor="cv-upload" className="cursor-pointer block">
                {cvFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-brand-slate-900">{cvFile.name}</p>
                      <p className="text-sm text-brand-grey-400">
                        {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCvFile(null); }}
                      className="p-1 rounded-full hover:bg-red-100 text-brand-grey-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className={`${isDragging ? 'text-brand-cyan' : 'text-brand-grey-400'}`}>
                    <Upload className={`h-10 w-10 mx-auto mb-2 ${isDragging ? 'text-brand-cyan' : 'text-brand-grey-300'}`} />
                    <p className="font-medium">
                      {isDragging ? 'Drop your CV here' : 'Drag & drop your CV here'}
                    </p>
                    <p className="text-sm mt-1">or click to browse</p>
                    <p className="text-xs mt-2 text-brand-grey-300">PDF, DOC, DOCX (max 10MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Previous Companies */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              Previous Companies
            </label>
            <Input
              placeholder="Type company name, use comma to separate, Enter to add..."
              value={companyInput}
              onChange={(e) => handleCompanyInputChange(e.target.value)}
              onKeyDown={handleCompanyKeyDown}
            />
            {previousCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {previousCompanies.map(company => (
                  <Badge key={company} variant="grey">
                    {company}
                    <button
                      type="button"
                      onClick={() => setPreviousCompanies(previousCompanies.filter(c => c !== company))}
                      className="ml-1.5 hover:text-slate-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-brand-grey-400 mt-1">Helps with searching candidates by company history</p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              Skills
            </label>
            <Input
              placeholder="Type skill, use comma to separate, Enter to add..."
              value={skillInput}
              onChange={(e) => handleSkillInputChange(e.target.value)}
              onKeyDown={handleSkillKeyDown}
            />
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map(skill => (
                  <Badge key={skill} variant="cyan">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter(s => s !== skill))}
                      className="ml-1.5 hover:text-cyan-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Textarea
            label="Summary"
            value={formData.summary}
            onChange={(e) => handleFormChange('summary', e.target.value)}
            placeholder="Brief overview of the candidate's background and experience..."
            rows={3}
          />

          {/* Assign Recruiter */}
          <Select
            label="Assign to Recruiter"
            options={[
              { value: '', label: '-- Select Recruiter --' },
              ...users
                .filter(u => u.role === 'recruiter' || u.role === 'admin')
                .map(u => ({ value: u.id, label: u.name }))
            ]}
            value={formData.assigned_recruiter_id}
            onChange={(e) => handleFormChange('assigned_recruiter_id', e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleSubmit} isLoading={isSubmitting}>
              Add Candidate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
