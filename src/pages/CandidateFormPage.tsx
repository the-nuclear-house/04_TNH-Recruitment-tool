import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
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
import type { RightToWork, SecurityVetting } from '@/types';

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
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    current_role: '',
    current_company: '',
    years_experience: '',
    degree: '',
    summary: '',
    right_to_work: 'unknown' as RightToWork,
    security_vetting: 'none' as SecurityVetting,
    open_to_relocate: false,
    relocation_preferences: '',
    current_salary: '',
    salary_expectation_min: '',
    salary_expectation_max: '',
    sector_flexibility: '',
    scope_flexibility: '',
    source: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: API call to save candidate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(
        isEditing ? 'Candidate updated' : 'Candidate added',
        isEditing ? 'The candidate has been updated successfully.' : 'The candidate has been added to your database.'
      );
      
      navigate('/candidates');
    } catch (error) {
      toast.error('Error', 'Failed to save candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              label="Current Role"
              value={formData.current_role}
              onChange={(e) => handleChange('current_role', e.target.value)}
              placeholder="e.g., Senior Software Engineer"
            />
            <Input
              label="Current Company"
              value={formData.current_company}
              onChange={(e) => handleChange('current_company', e.target.value)}
            />
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
            
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.open_to_relocate}
                  onChange={(e) => handleChange('open_to_relocate', e.target.checked)}
                  className="w-4 h-4 rounded border-brand-grey-200 text-brand-cyan focus:ring-brand-cyan"
                />
                <span className="text-sm font-medium text-brand-slate-700">
                  Open to relocation
                </span>
              </label>
            </div>
            
            {formData.open_to_relocate && (
              <div className="md:col-span-2">
                <Input
                  label="Relocation Preferences"
                  value={formData.relocation_preferences}
                  onChange={(e) => handleChange('relocation_preferences', e.target.value)}
                  placeholder="e.g., London, Manchester, Remote"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Salary Information */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Information</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Current Salary (£)"
              type="number"
              value={formData.current_salary}
              onChange={(e) => handleChange('current_salary', e.target.value)}
              placeholder="e.g., 75000"
            />
            <Input
              label="Salary Expectation Min (£)"
              type="number"
              value={formData.salary_expectation_min}
              onChange={(e) => handleChange('salary_expectation_min', e.target.value)}
              placeholder="e.g., 85000"
            />
            <Input
              label="Salary Expectation Max (£)"
              type="number"
              value={formData.salary_expectation_max}
              onChange={(e) => handleChange('salary_expectation_max', e.target.value)}
              placeholder="e.g., 95000"
            />
          </div>
        </Card>

        {/* Flexibility */}
        <Card>
          <CardHeader>
            <CardTitle>Flexibility</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Sector Flexibility"
              value={formData.sector_flexibility}
              onChange={(e) => handleChange('sector_flexibility', e.target.value)}
              placeholder="e.g., Defence, Finance, Healthcare"
            />
            <Input
              label="Scope Flexibility"
              value={formData.scope_flexibility}
              onChange={(e) => handleChange('scope_flexibility', e.target.value)}
              placeholder="e.g., Backend, Full-stack, Architecture"
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
