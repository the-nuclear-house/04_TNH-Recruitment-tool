import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X, Plus } from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  Button, 
  Input, 
  Select, 
  Textarea,
  Badge,
} from '@/components/ui';
import { useToast } from '@/lib/stores/ui-store';
import { candidatesService } from '@/lib/services';

const rightToWorkOptions = [
  { value: 'british_citizen', label: 'British Citizen' },
  { value: 'settled_status', label: 'Settled Status' },
  { value: 'pre_settled_status', label: 'Pre-settled Status' },
  { value: 'skilled_worker_visa', label: 'Skilled Worker Visa' },
  { value: 'graduate_visa', label: 'Graduate Visa' },
  { value: 'other_visa', label: 'Other Visa' },
  { value: 'requires_sponsorship', label: 'Requires Sponsorship' },
  { value: 'unknown', label: 'Unknown' },
];

const securityOptions = [
  { value: 'none', label: 'None' },
  { value: 'bpss', label: 'BPSS' },
  { value: 'ctc', label: 'CTC' },
  { value: 'sc', label: 'SC' },
  { value: 'esc', label: 'eSC' },
  { value: 'dv', label: 'DV' },
  { value: 'edv', label: 'eDV' },
];

const sourceOptions = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'referral', label: 'Referral' },
  { value: 'job_board', label: 'Job Board' },
  { value: 'direct_approach', label: 'Direct Approach' },
  { value: 'website', label: 'Company Website' },
  { value: 'event', label: 'Event/Conference' },
  { value: 'other', label: 'Other' },
];

export function CandidateFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const isEditing = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [previousCompanies, setPreviousCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [nationalityInput, setNationalityInput] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    years_experience: '',
    degree: '',
    summary: '',
    right_to_work: 'unknown',
    security_vetting: 'none',
    open_to_relocate: '',
    minimum_salary_expected: '',
    expected_day_rate: '',
    notice_period: '',
    contract_preference: '',
    source: '',
  });

  // Load candidate data when editing
  useEffect(() => {
    if (isEditing && id) {
      loadCandidate();
    }
  }, [id, isEditing]);

  const loadCandidate = async () => {
    try {
      setIsLoading(true);
      const candidate = await candidatesService.getById(id!);
      if (candidate) {
        setFormData({
          first_name: candidate.first_name || '',
          last_name: candidate.last_name || '',
          email: candidate.email || '',
          phone: candidate.phone || '',
          location: candidate.location || '',
          linkedin_url: candidate.linkedin_url || '',
          years_experience: candidate.years_experience?.toString() || '',
          degree: candidate.degree || '',
          summary: candidate.summary || '',
          right_to_work: candidate.right_to_work || 'unknown',
          security_vetting: candidate.security_vetting || 'none',
          open_to_relocate: candidate.open_to_relocate || '',
          minimum_salary_expected: candidate.minimum_salary_expected?.toString() || '',
          expected_day_rate: candidate.expected_day_rate?.toString() || '',
          notice_period: candidate.notice_period || '',
          contract_preference: candidate.contract_preference || '',
          source: candidate.source || '',
        });
        setSkills(candidate.skills || []);
        setPreviousCompanies(candidate.previous_companies || []);
        setNationalities(candidate.nationalities || []);
      }
    } catch (error) {
      console.error('Error loading candidate:', error);
      toast.error('Error', 'Failed to load candidate data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      const newSkills = skillInput.split(',').map(s => s.trim()).filter(s => s && !skills.includes(s));
      setSkills([...skills, ...newSkills]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddCompany = () => {
    if (companyInput.trim() && !previousCompanies.includes(companyInput.trim())) {
      setPreviousCompanies([...previousCompanies, companyInput.trim()]);
      setCompanyInput('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setPreviousCompanies(previousCompanies.filter(c => c !== company));
  };

  const handleAddNationality = () => {
    if (nationalityInput.trim() && !nationalities.includes(nationalityInput.trim())) {
      setNationalities([...nationalities, nationalityInput.trim()]);
      setNationalityInput('');
    }
  };

  const handleRemoveNationality = (nationality: string) => {
    setNationalities(nationalities.filter(n => n !== nationality));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const candidateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        location: formData.location || undefined,
        linkedin_url: formData.linkedin_url || undefined,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : undefined,
        degree: formData.degree || undefined,
        summary: formData.summary || undefined,
        right_to_work: formData.right_to_work || undefined,
        security_vetting: formData.security_vetting || undefined,
        open_to_relocate: formData.open_to_relocate || undefined,
        minimum_salary_expected: formData.minimum_salary_expected ? parseFloat(formData.minimum_salary_expected) : undefined,
        expected_day_rate: formData.expected_day_rate ? parseFloat(formData.expected_day_rate) : undefined,
        notice_period: formData.notice_period || undefined,
        contract_preference: formData.contract_preference || undefined,
        skills: skills.length > 0 ? skills : undefined,
        previous_companies: previousCompanies.length > 0 ? previousCompanies : undefined,
        nationalities: nationalities.length > 0 ? nationalities : undefined,
        source: formData.source || undefined,
      };

      if (isEditing) {
        await candidatesService.update(id!, candidateData);
      } else {
        await candidatesService.create({
          ...candidateData,
          email: formData.email, // email is required for create
        });
      }
      
      toast.success(
        isEditing ? 'Candidate updated' : 'Candidate added',
        isEditing ? 'The candidate has been updated successfully.' : 'The candidate has been added to your database.'
      );
      
      navigate(isEditing ? `/candidates/${id}` : '/candidates');
    } catch (error) {
      console.error('Error saving candidate:', error);
      toast.error('Error', 'Failed to save candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Loading..." />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading candidate...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title={isEditing ? 'Edit Candidate' : 'Add New Candidate'}
        subtitle={isEditing ? 'Update candidate information' : 'Add a new candidate to your database'}
        actions={
          <Button 
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/candidates')}
          >
            Back to Candidates
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              required
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              required
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+44 7700 900000"
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., London, Manchester"
            />
            <Input
              label="LinkedIn URL"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => handleChange('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Years of Experience"
              type="number"
              value={formData.years_experience}
              onChange={(e) => handleChange('years_experience', e.target.value)}
              min="0"
              max="50"
            />
            <Input
              label="Degree / Qualification"
              value={formData.degree}
              onChange={(e) => handleChange('degree', e.target.value)}
              placeholder="e.g., MSc Computer Science"
            />
            <div className="md:col-span-2">
              <Textarea
                label="Professional Summary"
                value={formData.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                placeholder="Brief overview of the candidate's background and expertise..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Engineering Skills</CardTitle>
          </CardHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add skills (comma-separated)..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddSkill}>
                Add
              </Button>
            </div>
            
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <Badge key={skill} variant="cyan">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1.5 hover:text-cyan-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <p className="text-sm text-brand-grey-400">
              Add relevant technical skills, programming languages, frameworks, and tools.
            </p>
          </div>
        </Card>

        {/* Administrative Details */}
        <Card>
          <CardHeader>
            <CardTitle>Administrative Details</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Right to Work"
              options={rightToWorkOptions}
              value={formData.right_to_work}
              onChange={(e) => handleChange('right_to_work', e.target.value)}
            />
            <Select
              label="Security Vetting"
              options={securityOptions}
              value={formData.security_vetting}
              onChange={(e) => handleChange('security_vetting', e.target.value)}
            />
            
            <Select
              label="Open to Relocate"
              options={[
                { value: '', label: 'Not specified' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'maybe', label: 'Maybe / Depends' },
              ]}
              value={formData.open_to_relocate}
              onChange={(e) => handleChange('open_to_relocate', e.target.value)}
            />
          </div>
        </Card>

        {/* Salary Information */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Information</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Minimum Salary Expected (£)"
              type="number"
              value={formData.minimum_salary_expected}
              onChange={(e) => handleChange('minimum_salary_expected', e.target.value)}
              placeholder="e.g., 75000"
            />
            <Input
              label="Expected Day Rate (£)"
              type="number"
              value={formData.expected_day_rate}
              onChange={(e) => handleChange('expected_day_rate', e.target.value)}
              placeholder="e.g., 500"
            />
            <Select
              label="Notice Period"
              options={[
                { value: '', label: 'Not specified' },
                { value: '1_week', label: '1 Week' },
                { value: '2_weeks', label: '2 Weeks' },
                { value: '1_month', label: '1 Month' },
                { value: '2_months', label: '2 Months' },
                { value: '3_months', label: '3 Months' },
                { value: 'immediate', label: 'Immediate' },
              ]}
              value={formData.notice_period}
              onChange={(e) => handleChange('notice_period', e.target.value)}
            />
            <Select
              label="Contract Preference"
              options={[
                { value: '', label: 'Not specified' },
                { value: 'permanent', label: 'Permanent' },
                { value: 'contractor', label: 'Contractor' },
                { value: 'open_to_both', label: 'Open to Both' },
              ]}
              value={formData.contract_preference}
              onChange={(e) => handleChange('contract_preference', e.target.value)}
            />
          </div>
        </Card>

        {/* Source */}
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="How did you find this candidate?"
              options={sourceOptions}
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
              placeholder="Select source"
            />
          </div>
        </Card>

        {/* CV Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          
          <div className="border-2 border-dashed border-brand-grey-200 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 mx-auto text-brand-grey-400 mb-3" />
            <p className="text-brand-slate-700 font-medium mb-1">
              Upload CV or documents
            </p>
            <p className="text-sm text-brand-grey-400 mb-4">
              PDF, DOC, or DOCX up to 10MB
            </p>
            <Button type="button" variant="secondary">
              Choose Files
            </Button>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="secondary"
            onClick={() => navigate('/candidates')}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            isLoading={isSubmitting}
          >
            {isEditing ? 'Update Candidate' : 'Add Candidate'}
          </Button>
        </div>
      </form>
    </div>
  );
}
