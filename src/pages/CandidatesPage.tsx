import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, X } from 'lucide-react';
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
import { candidatesService, type DbCandidate } from '@/lib/services';
import type { CandidateStatus } from '@/types';

export function CandidatesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [candidates, setCandidates] = useState<DbCandidate[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const permissions = usePermissions();
  const toast = useToast();

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    years_experience: '',
    minimum_salary: '',
    summary: '',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [previousCompanies, setPreviousCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillInputChange = (value: string) => {
    if (value.includes(',')) {
      const parts = value.split(',').map(s => s.trim()).filter(s => s);
      const newSkills = parts.filter(s => !skills.includes(s));
      if (newSkills.length > 0) {
        setSkills([...skills, ...newSkills]);
      }
      setSkillInput('');
    } else {
      setSkillInput(value);
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const handleCompanyInputChange = (value: string) => {
    if (value.includes(',')) {
      const parts = value.split(',').map(s => s.trim()).filter(s => s);
      const newCompanies = parts.filter(s => !previousCompanies.includes(s));
      if (newCompanies.length > 0) {
        setPreviousCompanies([...previousCompanies, ...newCompanies]);
      }
      setCompanyInput('');
    } else {
      setCompanyInput(value);
    }
  };

  const handleCompanyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && companyInput.trim()) {
      e.preventDefault();
      if (!previousCompanies.includes(companyInput.trim())) {
        setPreviousCompanies([...previousCompanies, companyInput.trim()]);
      }
      setCompanyInput('');
    }
  };

  // Load candidates from database
  const loadCandidates = async () => {
    try {
      setIsLoadingData(true);
      const data = await candidatesService.getAll();
      setCandidates(data);
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
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : undefined,
        minimum_salary_expected: formData.minimum_salary ? parseInt(formData.minimum_salary) : undefined,
        summary: formData.summary || undefined,
        skills: skills.length > 0 ? skills : undefined,
        previous_companies: previousCompanies.length > 0 ? previousCompanies : undefined,
      });
      
      toast.success('Candidate Added', `${formData.first_name} ${formData.last_name} has been added to the database`);
      setIsModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        location: '',
        years_experience: '',
        minimum_salary: '',
        summary: '',
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

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = !searchQuery || 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen">
      <Header 
        title="Candidates"
        subtitle={`${candidates.length} candidates in database`}
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

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                isSearch
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All statuses' },
                { value: 'new', label: 'New' },
                { value: 'phone_qualification', label: 'Phone Qualification' },
                { value: 'technical_interview', label: 'Technical Interview' },
                { value: 'director_interview', label: 'Director Interview' },
                { value: 'offer', label: 'Offer' },
                { value: 'hired', label: 'Hired' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Filter by status"
            />
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
                  <th>Candidate</th>
                  <th>Skills</th>
                  <th>Location</th>
                  <th>Experience</th>
                  <th>Min Salary</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th></th>
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
                        {candidate.skills?.slice(0, 3).map(skill => (
                          <Badge key={skill} variant="cyan" className="text-xs">{skill}</Badge>
                        ))}
                        {candidate.skills && candidate.skills.length > 3 && (
                          <span className="text-xs text-brand-grey-400">+{candidate.skills.length - 3}</span>
                        )}
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
                      <button 
                        className="p-1 rounded hover:bg-brand-grey-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Open actions menu
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4 text-brand-grey-400" />
                      </button>
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

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => handleFormChange('location', e.target.value)}
              placeholder="London"
            />
            <Input
              label="Years of Experience"
              type="number"
              value={formData.years_experience}
              onChange={(e) => handleFormChange('years_experience', e.target.value)}
              placeholder="5"
            />
            <Input
              label="Minimum Salary Expected (£)"
              type="number"
              value={formData.minimum_salary}
              onChange={(e) => handleFormChange('minimum_salary', e.target.value)}
              placeholder="75000"
            />
          </div>

          {/* CV Upload */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              CV / Resume
            </label>
            <div className="border-2 border-dashed border-brand-grey-200 rounded-lg p-4 text-center hover:border-brand-cyan transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                className="hidden"
                id="cv-upload"
              />
              <label htmlFor="cv-upload" className="cursor-pointer">
                {cvFile ? (
                  <div className="flex items-center justify-center gap-2 text-brand-cyan">
                    <span className="font-medium">{cvFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setCvFile(null); }}
                      className="text-brand-grey-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-brand-grey-400">
                    <p className="font-medium">Click to upload CV</p>
                    <p className="text-sm">PDF, DOC, DOCX (max 10MB)</p>
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
              placeholder="Type company name, press Enter or comma to add..."
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
              placeholder="Type skill, press Enter or comma to add..."
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
