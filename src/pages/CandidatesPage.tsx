import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, MoreHorizontal, X } from 'lucide-react';
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
import { formatDate, statusLabels, formatCurrency } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/lib/stores/ui-store';
import type { Candidate, RightToWork, SecurityVetting, CandidateStatus } from '@/types';

// Mock data - sorted by created_at descending (newest first)
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
    summary: 'Full-stack developer with expertise in cloud architecture.',
    skills: ['Python', 'AWS', 'Kubernetes', 'React'],
    right_to_work: 'british_citizen' as RightToWork,
    security_vetting: 'sc' as SecurityVetting,
    open_to_relocate: true,
    relocation_preferences: 'Manchester',
    current_salary: 85000,
    salary_expectation_min: 95000,
    salary_expectation_max: 110000,
    salary_currency: 'GBP',
    sector_flexibility: 'Defence, Finance',
    scope_flexibility: 'Backend, Full-stack',
    status: 'director_interview' as CandidateStatus,
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
    summary: 'DevOps specialist with CI/CD expertise.',
    skills: ['Terraform', 'AWS', 'Azure', 'Jenkins'],
    right_to_work: 'settled_status' as RightToWork,
    security_vetting: 'bpss' as SecurityVetting,
    open_to_relocate: false,
    relocation_preferences: null,
    current_salary: 75000,
    salary_expectation_min: 85000,
    salary_expectation_max: 95000,
    salary_currency: 'GBP',
    sector_flexibility: 'Any',
    scope_flexibility: 'DevOps, SRE',
    status: 'technical_interview' as CandidateStatus,
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
    summary: 'Data engineer specialising in scalable pipelines.',
    skills: ['Python', 'Spark', 'Airflow', 'SQL'],
    right_to_work: 'skilled_worker_visa' as RightToWork,
    security_vetting: 'none' as SecurityVetting,
    open_to_relocate: true,
    relocation_preferences: 'London',
    current_salary: 65000,
    salary_expectation_min: 75000,
    salary_expectation_max: 85000,
    salary_currency: 'GBP',
    sector_flexibility: 'Finance, Tech',
    scope_flexibility: 'Data Engineering',
    status: 'phone_qualification' as CandidateStatus,
    source: 'Job Board',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export function CandidatesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    current_role: '',
    current_company: '',
    years_experience: '',
    skills: '',
    summary: '',
  });

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Validation Error', 'Please fill in the required fields');
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Candidate Added', `${formData.first_name} ${formData.last_name} has been added to the database`);
    setIsModalOpen(false);
    setIsSubmitting(false);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      location: '',
      current_role: '',
      current_company: '',
      years_experience: '',
      skills: '',
      summary: '',
    });
  };

  const filteredCandidates = mockCandidates.filter(c => {
    const matchesSearch = !searchQuery || 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.current_role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen">
      <Header 
        title="Candidates"
        subtitle={`${mockCandidates.length} candidates in database`}
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
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>
        </Card>

        {/* Candidates Table */}
        {filteredCandidates.length === 0 ? (
          <EmptyState
            title="No candidates found"
            description="Try adjusting your filters or add a new candidate."
            action={{
              label: 'Add Candidate',
              onClick: () => navigate('/candidates/new'),
            }}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Experience</th>
                  <th>Salary Expectation</th>
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
                      <p className="text-brand-slate-900">{candidate.current_role}</p>
                      <p className="text-sm text-brand-grey-400">{candidate.current_company}</p>
                    </td>
                    <td className="text-brand-slate-700">{candidate.location}</td>
                    <td className="text-brand-slate-700">{candidate.years_experience} years</td>
                    <td className="text-brand-slate-700">
                      {formatCurrency(candidate.salary_expectation_min || 0)} - {formatCurrency(candidate.salary_expectation_max || 0)}
                    </td>
                    <td>
                      <Badge variant={getStatusVariant(candidate.status)}>
                        {statusLabels[candidate.status]}
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
        description="Enter the candidate's basic information"
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Role"
              value={formData.current_role}
              onChange={(e) => handleFormChange('current_role', e.target.value)}
              placeholder="Senior Software Engineer"
            />
            <Input
              label="Current Company"
              value={formData.current_company}
              onChange={(e) => handleFormChange('current_company', e.target.value)}
              placeholder="TechCorp Ltd"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <Input
            label="Skills (comma-separated)"
            value={formData.skills}
            onChange={(e) => handleFormChange('skills', e.target.value)}
            placeholder="Python, AWS, React, TypeScript"
          />

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
