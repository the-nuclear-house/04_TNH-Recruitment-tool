import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
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

const industryOptions = [
  { value: 'defence', label: 'Defence' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'government', label: 'Government' },
  { value: 'aerospace', label: 'Aerospace' },
  { value: 'nuclear', label: 'Nuclear' },
  { value: 'telecoms', label: 'Telecoms' },
  { value: 'energy', label: 'Energy' },
  { value: 'transport', label: 'Transport' },
  { value: 'retail', label: 'Retail' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'active', label: 'Active' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

const clearanceOptions = [
  { value: 'none', label: 'None Required' },
  { value: 'bpss', label: 'BPSS' },
  { value: 'ctc', label: 'CTC' },
  { value: 'sc', label: 'SC' },
  { value: 'esc', label: 'eSC' },
  { value: 'dv', label: 'DV' },
  { value: 'edv', label: 'eDV' },
  { value: 'doe_q', label: 'DOE Q (US)' },
  { value: 'doe_l', label: 'DOE L (US)' },
];

const disciplineOptions = [
  { value: 'electrical', label: 'Electrical Engineering' },
  { value: 'mechanical', label: 'Mechanical Engineering' },
  { value: 'civil', label: 'Civil Engineering' },
  { value: 'software', label: 'Software Engineering' },
  { value: 'systems', label: 'Systems Engineering' },
  { value: 'nuclear', label: 'Nuclear Engineering' },
  { value: 'chemical', label: 'Chemical Engineering' },
  { value: 'structural', label: 'Structural Engineering' },
  { value: 'other', label: 'Other' },
];

const managerOptions = [
  { value: 'user-manager-001', label: 'James Wilson' },
  { value: 'user-manager-002', label: 'Rebecca Taylor' },
  { value: 'user-manager-003', label: 'David Kumar' },
  { value: 'user-director-001', label: 'Sarah Thompson' },
];

export function RequirementFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const isEditing = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const [formData, setFormData] = useState({
    customer: '',
    industry: '',
    location: '',
    fte_count: '1',
    day_rate_min: '',
    day_rate_max: '',
    description: '',
    status: 'opportunity',
    clearance_required: 'none',
    engineering_discipline: 'software',
    manager_id: '',
  });

  const handleChange = (field: string, value: string) => {
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
      // Validation
      if (!formData.customer.trim()) {
        toast.error('Validation Error', 'Customer name is required');
        setIsSubmitting(false);
        return;
      }
      if (!formData.manager_id) {
        toast.error('Validation Error', 'Please assign a manager');
        setIsSubmitting(false);
        return;
      }

      // TODO: API call to save requirement
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(
        isEditing ? 'Requirement updated' : 'Requirement created',
        isEditing ? 'The requirement has been updated successfully.' : 'The requirement has been created successfully.'
      );

      navigate('/requirements');
    } catch (error) {
      toast.error('Error', 'Failed to save requirement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title={isEditing ? 'Edit Requirement' : 'New Requirement'}
        subtitle={isEditing ? 'Update requirement details' : 'Create a new customer requirement'}
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/requirements')}
          >
            Back to Requirements
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-4xl">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name *"
              value={formData.customer}
              onChange={(e) => handleChange('customer', e.target.value)}
              placeholder="e.g., BAE Systems"
              required
            />
            <Select
              label="Industry *"
              options={industryOptions}
              value={formData.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              placeholder="Select industry"
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., London, Remote, Hybrid"
            />
            <Select
              label="Status *"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
            />
          </div>
        </Card>

        {/* Requirement Details */}
        <Card>
          <CardHeader>
            <CardTitle>Requirement Details</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="FTE Count *"
              type="number"
              min="1"
              value={formData.fte_count}
              onChange={(e) => handleChange('fte_count', e.target.value)}
              placeholder="Number of positions"
            />
            <Input
              label="Day Rate Min (£)"
              type="number"
              value={formData.day_rate_min}
              onChange={(e) => handleChange('day_rate_min', e.target.value)}
              placeholder="e.g., 450"
            />
            <Input
              label="Day Rate Max (£)"
              type="number"
              value={formData.day_rate_max}
              onChange={(e) => handleChange('day_rate_max', e.target.value)}
              placeholder="e.g., 550"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Select
              label="Engineering Discipline *"
              options={disciplineOptions}
              value={formData.engineering_discipline}
              onChange={(e) => handleChange('engineering_discipline', e.target.value)}
            />
            <Select
              label="Clearance Required"
              options={clearanceOptions}
              value={formData.clearance_required}
              onChange={(e) => handleChange('clearance_required', e.target.value)}
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the requirement, project details, team structure, etc."
              rows={4}
            />
          </div>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
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
              Add specific technical skills, certifications, or tools required for this role
            </p>
          </div>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Assigned Manager *"
              options={managerOptions}
              value={formData.manager_id}
              onChange={(e) => handleChange('manager_id', e.target.value)}
              placeholder="Select manager"
            />
            <div>
              <p className="text-sm text-brand-grey-400 mt-6">
                The assigned manager will be responsible for finding candidates for this requirement.
              </p>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/requirements')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            {isEditing ? 'Update Requirement' : 'Create Requirement'}
          </Button>
        </div>
      </form>
    </div>
  );
}
