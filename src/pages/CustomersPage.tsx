import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout';
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  Badge,
  Avatar,
  ConfirmDialog,
} from '@/components/ui';
import {
  Plus,
  Minus,
  Building2,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  Edit,
  Trash2,
  Calendar,
  Briefcase,
  User,
  ExternalLink,
  Clock,
  FileText,
  GitBranch,
  FolderTree,
  Network,
  PanelLeftClose,
  PanelLeft,
  ZoomIn,
  ZoomOut,
  Move,
  Upload,
  Image,
  X,
} from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  companiesService,
  contactsService,
  customerMeetingsService,
  requirementsService,
  type DbCompany,
  type DbContact,
  type DbCustomerMeeting,
  type DbRequirement,
} from '@/lib/services';

const industryOptions = [
  { value: '', label: 'Select Industry' },
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'defence', label: 'Defence & Aerospace' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'government', label: 'Government & Public Sector' },
  { value: 'other', label: 'Other' },
];

const companySizeOptions = [
  { value: '', label: 'Select Size' },
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-200)' },
  { value: 'large', label: 'Large (201-1000)' },
  { value: 'enterprise', label: 'Enterprise (1000+)' },
];

const statusOptions = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'former', label: 'Former' },
];

const meetingTypeOptions = [
  { value: 'call', label: 'Phone Call' },
  { value: 'video', label: 'Video Call' },
  { value: 'in_person', label: 'In Person' },
  { value: 'email', label: 'Email' },
];

// Requirement options
const reqIndustryOptions = [
  { value: '', label: 'Select Industry' },
  { value: 'defence', label: 'Defence' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'government', label: 'Government' },
  { value: 'aerospace', label: 'Aerospace' },
  { value: 'nuclear', label: 'Nuclear' },
  { value: 'telecoms', label: 'Telecoms' },
  { value: 'energy', label: 'Energy' },
  { value: 'transport', label: 'Transport' },
  { value: 'technology', label: 'Technology' },
];

const reqStatusOptions = [
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'active', label: 'Active' },
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

const engineeringOptions = [
  { value: 'software', label: 'Software Engineering' },
  { value: 'electrical', label: 'Electrical Engineering' },
  { value: 'mechanical', label: 'Mechanical Engineering' },
  { value: 'civil', label: 'Civil Engineering' },
  { value: 'systems', label: 'Systems Engineering' },
  { value: 'nuclear', label: 'Nuclear Engineering' },
  { value: 'chemical', label: 'Chemical Engineering' },
  { value: 'structural', label: 'Structural Engineering' },
  { value: 'other', label: 'Other' },
];

const statusColours: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-grey-100 text-grey-800',
  former: 'bg-red-100 text-red-800',
};

type TabType = 'contacts' | 'org-chart' | 'locations' | 'requirements';

export function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const toast = useToast();

  // Data
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<DbCompany | null>(null);
  const [selectedContact, setSelectedContact] = useState<DbContact | null>(null);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [meetings, setMeetings] = useState<DbCustomerMeeting[]>([]);
  const [requirements, setRequirements] = useState<DbRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orgChartZoom, setOrgChartZoom] = useState(1);

  // Company modal
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    trading_name: '',
    companies_house_number: '',
    industry: '',
    company_size: '',
    parent_company_id: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    county: '',
    postcode: '',
    main_phone: '',
    main_email: '',
    website: '',
    status: 'prospect',
    notes: '',
    logo_url: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Contact modal
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
    email: '',
    phone: '',
    mobile: '',
    linkedin_url: '',
    is_primary_contact: false,
    notes: '',
    role: '',
    reports_to_id: '',
  });

  // Meeting modal
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    contact_id: '',
    meeting_type: 'call',
    subject: '',
    scheduled_at: '',
    scheduled_time: '',
    duration_minutes: '30',
    location: '',
    notes: '',
  });

  // Contact detail modal
  const [isContactDetailOpen, setIsContactDetailOpen] = useState(false);
  const [contactMeetings, setContactMeetings] = useState<DbCustomerMeeting[]>([]);

  // Requirement modal
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [requirementForm, setRequirementForm] = useState({
    customer: '',
    industry: '',
    location: '',
    fte_count: '1',
    max_day_rate: '',
    description: '',
    status: 'opportunity',
    clearance_required: 'none',
    engineering_discipline: 'software',
  });
  const [requirementSkills, setRequirementSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'company' | 'contact'; item: any } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCompanies = async () => {
    try {
      const data = await companiesService.getAll();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Error', 'Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyDetails = async (companyId: string) => {
    try {
      const [company, companyContacts, companyMeetings] = await Promise.all([
        companiesService.getById(companyId),
        contactsService.getByCompany(companyId),
        customerMeetingsService.getByCompany(companyId),
      ]);
      setSelectedCompany(company);
      setContacts(companyContacts);
      setMeetings(companyMeetings);
      setSelectedContact(null);

      // Load requirements based on whether this is a parent or subcompany
      await loadRequirements(company);
    } catch (error: any) {
      console.error('Error loading company details:', error);
      toast.error('Error', error.message || 'Failed to load company details');
    }
  };

  const loadRequirements = async (company: DbCompany | null) => {
    if (!company) return;

    try {
      // If this is a parent company, get requirements from all subsidiaries too
      if (!company.parent_company_id) {
        const subsidiaryIds = companies
          .filter(c => c.parent_company_id === company.id)
          .map(c => c.id);
        const allCompanyIds = [company.id, ...subsidiaryIds];
        const reqs = await requirementsService.getByCompanies(allCompanyIds);
        setRequirements(reqs);
      } else {
        // Subcompany - only show its own requirements
        const reqs = await requirementsService.getByCompany(company.id);
        setRequirements(reqs);
      }
    } catch (error) {
      console.error('Error loading requirements:', error);
    }
  };

  const loadContactDetails = async (contact: DbContact) => {
    setSelectedContact(contact);
    setIsContactDetailOpen(true);

    // Load meetings for this specific contact
    try {
      const allMeetings = await customerMeetingsService.getByCompany(contact.company_id);
      const contactMeetings = allMeetings.filter(m => m.contact_id === contact.id);
      setContactMeetings(contactMeetings);
    } catch (error) {
      console.error('Error loading contact meetings:', error);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Re-load requirements when companies change (for subsidiary count)
  useEffect(() => {
    if (selectedCompany) {
      loadRequirements(selectedCompany);
    }
  }, [companies]);

  // Filter companies by search
  const filteredCompanies = useMemo(() => {
    if (!sidebarSearch) return companies;
    const query = sidebarSearch.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.trading_name?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query)
    );
  }, [companies, sidebarSearch]);

  // Separate parent companies and get subsidiaries
  const parentCompanies = useMemo(() =>
    filteredCompanies.filter(c => !c.parent_company_id),
    [filteredCompanies]
  );

  const getSubsidiaries = (parentId: string) =>
    filteredCompanies.filter(c => c.parent_company_id === parentId);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    const query = contactSearch.toLowerCase();
    return contacts.filter(c =>
      c.first_name.toLowerCase().includes(query) ||
      c.last_name.toLowerCase().includes(query) ||
      c.job_title?.toLowerCase().includes(query) ||
      c.role?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  }, [contacts, contactSearch]);

  // Toggle company expansion in sidebar
  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  // Company handlers
  const handleOpenAddCompany = (parentId?: string) => {
    setIsEditingCompany(false);
    setCompanyForm({
      name: '',
      trading_name: '',
      companies_house_number: '',
      industry: '',
      company_size: '',
      parent_company_id: parentId || '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      county: '',
      postcode: '',
      main_phone: '',
      main_email: '',
      website: '',
      status: 'prospect',
      notes: '',
      logo_url: '',
    });
    setLogoFile(null);
    setLogoPreview(null);
    setIsCompanyModalOpen(true);
  };

  const handleEditCompany = () => {
    if (!selectedCompany) return;
    setIsEditingCompany(true);
    setCompanyForm({
      name: selectedCompany.name,
      trading_name: selectedCompany.trading_name || '',
      companies_house_number: selectedCompany.companies_house_number || '',
      industry: selectedCompany.industry || '',
      company_size: selectedCompany.company_size || '',
      parent_company_id: selectedCompany.parent_company_id || '',
      address_line_1: selectedCompany.address_line_1 || '',
      address_line_2: selectedCompany.address_line_2 || '',
      city: selectedCompany.city || '',
      county: selectedCompany.county || '',
      postcode: selectedCompany.postcode || '',
      main_phone: selectedCompany.main_phone || '',
      main_email: selectedCompany.main_email || '',
      website: selectedCompany.website || '',
      status: selectedCompany.status,
      notes: selectedCompany.notes || '',
      logo_url: selectedCompany.logo_url || '',
    });
    setLogoFile(null);
    setLogoPreview(selectedCompany.logo_url || null);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name) {
      toast.error('Validation Error', 'Company name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // If there's a new logo file, use the preview (data URL)
      const formData = {
        ...companyForm,
        logo_url: logoPreview || companyForm.logo_url || null,
      };
      
      if (isEditingCompany && selectedCompany) {
        await companiesService.update(selectedCompany.id, formData);
        toast.success('Company Updated', 'Company details have been saved');
        await loadCompanyDetails(selectedCompany.id);
      } else {
        const newCompany = await companiesService.create(formData);
        toast.success('Company Created', `${companyForm.name} has been added`);
        setSelectedCompany(newCompany);
        await loadCompanyDetails(newCompany.id);
      }
      setIsCompanyModalOpen(false);
      await loadCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      toast.error('Error', error.message || 'Failed to save company');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Contact handlers
  const handleOpenAddContact = () => {
    setIsEditingContact(false);
    setEditingContactId(null);
    setContactForm({
      first_name: '',
      last_name: '',
      job_title: '',
      department: '',
      email: '',
      phone: '',
      mobile: '',
      linkedin_url: '',
      is_primary_contact: false,
      notes: '',
      role: '',
      reports_to_id: '',
    });
    setIsContactModalOpen(true);
  };

  const handleEditContact = (contact: DbContact) => {
    setIsEditingContact(true);
    setEditingContactId(contact.id);
    setContactForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      job_title: '',
      department: contact.department || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      linkedin_url: contact.linkedin_url || '',
      is_primary_contact: contact.is_primary_contact,
      notes: contact.notes || '',
      role: contact.role || '',
      reports_to_id: contact.reports_to_id || '',
    });
    setIsContactModalOpen(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.first_name || !contactForm.last_name) {
      toast.error('Validation Error', 'First and last name are required');
      return;
    }
    if (!selectedCompany) return;

    setIsSubmitting(true);
    try {
      const inputData = {
        ...contactForm,
        company_id: selectedCompany.id,
        reports_to_id: contactForm.reports_to_id || null,
        is_primary_contact: false, // Remove this field usage
      };

      if (isEditingContact && editingContactId) {
        await contactsService.update(editingContactId, inputData);
        toast.success('Contact Updated', 'Contact details have been saved');
      } else {
        await contactsService.create(inputData);
        toast.success('Contact Added', `${contactForm.first_name} ${contactForm.last_name} has been added`);
      }
      setIsContactModalOpen(false);
      await loadCompanyDetails(selectedCompany.id);
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast.error('Error', error.message || 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Meeting handlers - now from contact level
  const handleOpenAddMeeting = (contact?: DbContact) => {
    // Close contact detail modal if open
    setIsContactDetailOpen(false);
    
    setMeetingForm({
      contact_id: contact?.id || selectedContact?.id || '',
      meeting_type: 'call',
      subject: '',
      scheduled_at: '',
      scheduled_time: '',
      duration_minutes: '30',
      location: '',
      notes: '',
    });
    setIsMeetingModalOpen(true);
  };

  const handleSaveMeeting = async () => {
    if (!meetingForm.subject) {
      toast.error('Validation Error', 'Subject is required');
      return;
    }
    if (!selectedCompany) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = meetingForm.scheduled_at && meetingForm.scheduled_time
        ? `${meetingForm.scheduled_at}T${meetingForm.scheduled_time}:00`
        : undefined;

      await customerMeetingsService.create({
        company_id: selectedCompany.id,
        contact_id: meetingForm.contact_id || undefined,
        meeting_type: meetingForm.meeting_type,
        subject: meetingForm.subject,
        scheduled_at: scheduledAt,
        duration_minutes: parseInt(meetingForm.duration_minutes) || undefined,
        location: meetingForm.location || undefined,
        notes: meetingForm.notes || undefined,
      });
      toast.success('Meeting Scheduled', 'Meeting has been added');
      setIsMeetingModalOpen(false);
      loadCompanyDetails(selectedCompany.id);

      // Refresh contact meetings if viewing contact detail
      if (selectedContact) {
        loadContactDetails(selectedContact);
      }
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      toast.error('Error', error.message || 'Failed to save meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (type: 'company' | 'contact', item: any) => {
    // Only admin can delete companies
    if (type === 'company' && !isAdmin) {
      toast.error('Permission Denied', 'Only administrators can delete companies');
      return;
    }
    setDeleteTarget({ type, item });
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    try {
      if (deleteTarget.type === 'company') {
        await companiesService.delete(deleteTarget.item.id);
        toast.success('Company Deleted', 'Company has been removed');
        // Clear all related state
        setSelectedCompany(null);
        setContacts([]);
        setMeetings([]);
        setRequirements([]);
        setSelectedContact(null);
        // Reload the companies list
        await loadCompanies();
      } else {
        await contactsService.delete(deleteTarget.item.id);
        toast.success('Contact Removed', 'Contact has been removed');
        if (selectedCompany) {
          await loadCompanyDetails(selectedCompany.id);
        }
        setIsContactDetailOpen(false);
        setSelectedContact(null);
      }
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error('Error', error.message || 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRequirement = (contact?: DbContact) => {
    // Close contact detail modal if open
    setIsContactDetailOpen(false);
    
    if (selectedCompany) {
      // Pre-fill form with company info
      setRequirementForm({
        customer: selectedCompany.name,
        industry: selectedCompany.industry || '',
        location: selectedCompany.city || '',
        fte_count: '1',
        max_day_rate: '',
        description: '',
        status: 'opportunity',
        clearance_required: 'none',
        engineering_discipline: 'software',
      });
      setRequirementSkills([]);
      setSkillInput('');
      setIsRequirementModalOpen(true);
    }
  };

  const handleSaveRequirement = async () => {
    if (!requirementForm.customer) {
      toast.error('Validation Error', 'Customer name is required');
      return;
    }
    if (!selectedCompany) return;

    setIsSubmitting(true);
    try {
      await requirementsService.create({
        customer: requirementForm.customer,
        company_id: selectedCompany.id,
        industry: requirementForm.industry || undefined,
        location: requirementForm.location || undefined,
        fte_count: parseInt(requirementForm.fte_count) || 1,
        max_day_rate: requirementForm.max_day_rate ? parseInt(requirementForm.max_day_rate) : undefined,
        description: requirementForm.description || undefined,
        status: requirementForm.status,
        clearance_required: requirementForm.clearance_required,
        engineering_discipline: requirementForm.engineering_discipline,
        skills: requirementSkills.length > 0 ? requirementSkills : undefined,
        created_by: user?.id,
      });
      
      toast.success('Requirement Created', `${requirementForm.customer} requirement has been created`);
      setIsRequirementModalOpen(false);
      // Reload company details to show new requirement
      await loadCompanyDetails(selectedCompany.id);
    } catch (error: any) {
      console.error('Error creating requirement:', error);
      toast.error('Error', error.message || 'Failed to create requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const parts = skillInput.split(',').map(s => s.trim()).filter(s => s);
      const newSkills = parts.filter(s => !requirementSkills.includes(s));
      if (newSkills.length > 0) {
        setRequirementSkills([...requirementSkills, ...newSkills]);
      }
      setSkillInput('');
    }
  };

  // Build org chart tree
  const buildOrgChart = () => {
    // Find contacts with no reports_to (top level)
    const topLevel = contacts.filter(c => !c.reports_to_id);

    const getDirectReports = (contactId: string): DbContact[] => {
      return contacts.filter(c => c.reports_to_id === contactId);
    };

    const renderOrgNode = (contact: DbContact, level: number = 0, isLast: boolean = false, isFirst: boolean = false): JSX.Element => {
      const directReports = getDirectReports(contact.id);

      return (
        <li key={contact.id} className="relative flex flex-col items-center pt-5">
          {/* Contact Card */}
          <div
            className="relative bg-white border-2 border-brand-grey-200 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-brand-cyan transition-all cursor-pointer min-w-[200px] z-10"
            onClick={() => loadContactDetails(contact)}
          >
            <div className="flex items-center gap-3">
              <Avatar name={`${contact.first_name} ${contact.last_name}`} size="md" />
              <div>
                <p className="font-semibold text-brand-slate-900 text-sm">
                  {contact.first_name} {contact.last_name}
                </p>
                <p className="text-xs text-brand-cyan font-medium">{contact.role || 'No role'}</p>
              </div>
            </div>
          </div>

          {/* Children */}
          {directReports.length > 0 && (
            <ul className="relative flex flex-row gap-0 pt-5">
              {/* Vertical line down from parent */}
              <div className="absolute top-0 left-1/2 w-0.5 h-5 bg-brand-cyan -translate-x-1/2" />
              
              {directReports.map((report, index) => (
                <li key={report.id} className="relative px-4">
                  {/* Horizontal line */}
                  <div className={`absolute top-0 h-0.5 bg-brand-cyan ${
                    index === 0 && directReports.length > 1 ? 'left-1/2 right-0' :
                    index === directReports.length - 1 && directReports.length > 1 ? 'left-0 right-1/2' :
                    directReports.length === 1 ? 'hidden' : 'left-0 right-0'
                  }`} />
                  {/* Vertical line to child */}
                  <div className="absolute top-0 left-1/2 w-0.5 h-5 bg-brand-cyan -translate-x-1/2" />
                  {renderOrgNode(report, level + 1)}
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    };

    if (topLevel.length === 0) {
      return (
        <div className="text-center py-12">
          <Network className="h-12 w-12 mx-auto text-brand-grey-300 mb-4" />
          <p className="text-brand-grey-500">No org chart data yet</p>
          <p className="text-sm text-brand-grey-400 mt-1">Add contacts with roles and direct reports to build the org chart</p>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-md p-1">
          <button
            onClick={() => setOrgChartZoom(z => Math.max(0.5, z - 0.1))}
            className="p-2 hover:bg-brand-grey-100 rounded-lg transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-brand-grey-600" />
          </button>
          <span className="text-sm text-brand-grey-600 min-w-[50px] text-center">
            {Math.round(orgChartZoom * 100)}%
          </span>
          <button
            onClick={() => setOrgChartZoom(z => Math.min(1.5, z + 0.1))}
            className="p-2 hover:bg-brand-grey-100 rounded-lg transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-brand-grey-600" />
          </button>
          <button
            onClick={() => setOrgChartZoom(1)}
            className="p-2 hover:bg-brand-grey-100 rounded-lg transition-colors text-xs text-brand-grey-600"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>

        {/* Scrollable container */}
        <div className="overflow-auto max-h-[600px] py-8 px-4">
          <ul 
            className="flex justify-center gap-8 min-w-max transition-transform duration-200 list-none m-0 p-0"
            style={{ transform: `scale(${orgChartZoom})`, transformOrigin: 'top center' }}
          >
            {topLevel.map(contact => renderOrgNode(contact))}
          </ul>
        </div>
      </div>
    );
  };

  // Tabs configuration
  const tabs = [
    { id: 'contacts' as TabType, label: 'Contacts', icon: Users, count: contacts.length },
    { id: 'org-chart' as TabType, label: 'Org Chart', icon: Network },
    { id: 'locations' as TabType, label: 'Locations & Subcompanies', icon: FolderTree, count: selectedCompany?.subsidiaries?.length || getSubsidiaries(selectedCompany?.id || '').length },
    { id: 'requirements' as TabType, label: 'Requirements', icon: Briefcase, count: requirements.length },
  ];

  return (
    <div className="min-h-screen">
      <Header
        title="Customers"
        subtitle="Manage companies and contacts"
        actions={
          <Button
            variant="success"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => handleOpenAddCompany()}
          >
            Add Company
          </Button>
        }
      />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Company List (Collapsible) */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} border-r border-brand-grey-200 bg-white flex flex-col transition-all duration-300`}>
          {/* Collapse Toggle */}
          <div className="p-2 border-b border-brand-grey-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-sm font-medium text-brand-slate-700 px-2">Companies</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-brand-grey-100 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4 text-brand-grey-500" />
              ) : (
                <PanelLeftClose className="h-4 w-4 text-brand-grey-500" />
              )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="p-4 border-b border-brand-grey-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey-400" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-brand-grey-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan"
                  />
                </div>
              </div>

              {/* Company Tree */}
              <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                  <div className="text-center py-8 text-brand-grey-400">Loading...</div>
                ) : parentCompanies.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-10 w-10 mx-auto text-brand-grey-300 mb-2" />
                    <p className="text-sm text-brand-grey-400">No companies yet</p>
                  </div>
                ) : (
              <div className="space-y-1">
                {parentCompanies.map(company => {
                  const subsidiaries = getSubsidiaries(company.id);
                  const hasSubsidiaries = subsidiaries.length > 0;
                  const isExpanded = expandedCompanies.has(company.id);

                  return (
                    <div key={company.id}>
                      {/* Parent Company */}
                      <div className="flex items-center">
                        {hasSubsidiaries && (
                          <button
                            onClick={() => toggleCompanyExpanded(company.id)}
                            className="p-1 hover:bg-brand-grey-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-brand-grey-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-brand-grey-400" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => loadCompanyDetails(company.id)}
                          className={`flex-1 text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                            selectedCompany?.id === company.id
                              ? 'bg-brand-cyan/10 text-brand-cyan'
                              : 'hover:bg-brand-grey-100'
                          } ${!hasSubsidiaries ? 'ml-6' : ''}`}
                        >
                          <Building2 className="h-5 w-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{company.name}</p>
                            {company.city && (
                              <p className="text-xs text-brand-grey-400 truncate">{company.city}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColours[company.status]}`}>
                            {company.status}
                          </span>
                        </button>
                      </div>

                      {/* Subsidiaries (Collapsible) */}
                      {hasSubsidiaries && isExpanded && (
                        <div className="ml-6 border-l-2 border-brand-grey-200 pl-2">
                          {subsidiaries.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => loadCompanyDetails(sub.id)}
                              className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                                selectedCompany?.id === sub.id
                                  ? 'bg-brand-cyan/10 text-brand-cyan'
                                  : 'hover:bg-brand-grey-100'
                              }`}
                            >
                              <MapPin className="h-4 w-4 flex-shrink-0 text-brand-grey-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{sub.name}</p>
                                {sub.city && (
                                  <p className="text-xs text-brand-grey-400 truncate">{sub.city}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-brand-grey-50">
          {selectedCompany ? (
            <div className="p-6 space-y-6">
              {/* Company Header Card */}
              <div className="bg-gradient-to-r from-brand-slate-900 to-brand-slate-800 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Logo or default icon */}
                    {selectedCompany.logo_url ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                        <img 
                          src={selectedCompany.logo_url} 
                          alt={`${selectedCompany.name} logo`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
                      {selectedCompany.trading_name && (
                        <p className="text-white/70">Trading as: {selectedCompany.trading_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          selectedCompany.status === 'active' ? 'bg-green-500' :
                          selectedCompany.status === 'prospect' ? 'bg-blue-500' :
                          'bg-grey-500'
                        }`}>
                          {selectedCompany.status.charAt(0).toUpperCase() + selectedCompany.status.slice(1)}
                        </span>
                        {selectedCompany.industry && (
                          <span className="text-sm text-white/70">{selectedCompany.industry}</span>
                        )}
                        {selectedCompany.companies_house_number && (
                          <span className="text-sm text-white/50">#{selectedCompany.companies_house_number}</span>
                        )}
                        {selectedCompany.parent_company_id && (
                          <Badge variant="cyan">
                            Subcompany
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleEditCompany}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="secondary" size="sm" onClick={() => handleDeleteClick('company', selectedCompany)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick Info Row */}
                <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                  {selectedCompany.main_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-white/50" />
                      <span className="text-sm">{selectedCompany.main_phone}</span>
                    </div>
                  )}
                  {selectedCompany.main_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-white/50" />
                      <span className="text-sm">{selectedCompany.main_email}</span>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-white/50" />
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                        {selectedCompany.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {selectedCompany.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-white/50" />
                      <span className="text-sm">{selectedCompany.city}, {selectedCompany.postcode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Company level */}
              <div className="flex gap-3">
                <Button variant="secondary" leftIcon={<User className="h-4 w-4" />} onClick={handleOpenAddContact}>
                  Add Contact
                </Button>
                {!selectedCompany.parent_company_id && (
                  <Button variant="secondary" leftIcon={<Building2 className="h-4 w-4" />} onClick={() => handleOpenAddCompany(selectedCompany.id)}>
                    Add Location / Subcompany
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-brand-grey-200">
                <div className="flex gap-1">
                  {tabs.map(tab => {
                    // Hide Locations tab for subcompanies
                    if (tab.id === 'locations' && selectedCompany.parent_company_id) return null;

                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-brand-cyan text-brand-cyan'
                            : 'border-transparent text-brand-grey-500 hover:text-brand-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            activeTab === tab.id
                              ? 'bg-brand-cyan/10 text-brand-cyan'
                              : 'bg-brand-grey-100 text-brand-grey-500'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {/* Contacts Tab */}
                {activeTab === 'contacts' && (
                  <div>
                    {/* Search */}
                    <div className="mb-4">
                      <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey-400" />
                        <input
                          type="text"
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-brand-grey-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan"
                        />
                      </div>
                    </div>

                    {filteredContacts.length === 0 ? (
                      <Card className="p-8 text-center">
                        <User className="h-12 w-12 mx-auto text-brand-grey-300 mb-3" />
                        <p className="text-brand-grey-500">No contacts yet</p>
                        <Button variant="primary" size="sm" className="mt-4" onClick={handleOpenAddContact}>
                          Add First Contact
                        </Button>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {filteredContacts.map(contact => (
                          <Card
                            key={contact.id}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => loadContactDetails(contact)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <Avatar name={`${contact.first_name} ${contact.last_name}`} size="lg" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-brand-slate-900">
                                      {contact.first_name} {contact.last_name}
                                    </p>
                                    {contact.is_primary_contact && (
                                      <Badge variant="cyan">Primary</Badge>
                                    )}
                                  </div>
                                  {contact.role && (
                                    <p className="text-sm text-brand-cyan">{contact.role}</p>
                                  )}
                                  {contact.department && (
                                    <p className="text-sm text-brand-grey-500">{contact.department}</p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-sm text-brand-grey-400">
                                    {contact.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" />
                                        {contact.email}
                                      </span>
                                    )}
                                  </div>
                                  {contact.reports_to && (
                                    <p className="text-xs text-brand-grey-400 mt-1">
                                      Reports to: {contact.reports_to.first_name} {contact.reports_to.last_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Org Chart Tab */}
                {activeTab === 'org-chart' && (
                  <div className="bg-brand-grey-100 rounded-xl p-6 min-h-[400px]">
                    {buildOrgChart()}
                  </div>
                )}

                {/* Locations & Subcompanies Tab */}
                {activeTab === 'locations' && !selectedCompany.parent_company_id && (
                  <div>
                    {(() => {
                      const subsidiaries = getSubsidiaries(selectedCompany.id);

                      if (subsidiaries.length === 0) {
                        return (
                          <Card className="p-8 text-center">
                            <FolderTree className="h-12 w-12 mx-auto text-brand-grey-300 mb-3" />
                            <p className="text-brand-grey-500">No locations or subcompanies</p>
                            <Button
                              variant="primary"
                              size="sm"
                              className="mt-4"
                              onClick={() => handleOpenAddCompany(selectedCompany.id)}
                            >
                              Add First Location
                            </Button>
                          </Card>
                        );
                      }

                      return (
                        <div className="grid grid-cols-3 gap-4">
                          {subsidiaries.map(sub => (
                            <Card
                              key={sub.id}
                              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => loadCompanyDetails(sub.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-grey-100 rounded-lg">
                                  <MapPin className="h-5 w-5 text-brand-grey-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-brand-slate-900">{sub.name}</p>
                                  {sub.city && (
                                    <p className="text-sm text-brand-grey-400">{sub.city}, {sub.postcode}</p>
                                  )}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColours[sub.status]}`}>
                                  {sub.status}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Requirements Tab */}
                {activeTab === 'requirements' && (
                  <div>
                    {requirements.length === 0 ? (
                      <Card className="p-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto text-brand-grey-300 mb-3" />
                        <p className="text-brand-grey-500">No requirements yet</p>
                        <p className="text-sm text-brand-grey-400 mt-1">
                          Create requirements from a contact's profile
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {requirements.map(req => (
                          <Card
                            key={req.id}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/requirements/${req.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-brand-slate-900">{req.customer}</p>
                                  <Badge variant={
                                    req.status === 'open' ? 'green' :
                                    req.status === 'filled' ? 'cyan' :
                                    req.status === 'cancelled' ? 'red' : 'grey'
                                  }>
                                    {req.status}
                                  </Badge>
                                </div>
                                {req.description && (
                                  <p className="text-sm text-brand-grey-500 mt-1 line-clamp-2">{req.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-brand-grey-400">
                                  {req.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {req.location}
                                    </span>
                                  )}
                                  {req.fte_count && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3.5 w-3.5" />
                                      {req.fte_count} position{req.fte_count > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {req.company && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3.5 w-3.5" />
                                      {req.company.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {req.max_day_rate && (
                                  <p className="text-sm font-medium text-brand-slate-900">
                                    £{req.max_day_rate}/day
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes Section */}
              {selectedCompany.notes && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold text-brand-slate-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h4>
                  <p className="text-sm text-brand-grey-600 whitespace-pre-wrap">{selectedCompany.notes}</p>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Building2 className="h-16 w-16 mx-auto text-brand-grey-300 mb-4" />
                <h3 className="text-xl font-semibold text-brand-slate-900 mb-2">Select a Company</h3>
                <p className="text-brand-grey-400 mb-4">Choose a company from the list or add a new one</p>
                <Button variant="success" leftIcon={<Plus className="h-4 w-4" />} onClick={() => handleOpenAddCompany()}>
                  Add Company
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <Modal
          isOpen={isContactDetailOpen}
          onClose={() => { setIsContactDetailOpen(false); }}
          title={`${selectedContact.first_name} ${selectedContact.last_name}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Contact Header */}
            <div className="flex items-start gap-4">
              <Avatar name={`${selectedContact.first_name} ${selectedContact.last_name}`} size="xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-brand-slate-900">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h3>
                  {selectedContact.is_primary_contact && (
                    <Badge variant="cyan">Primary Contact</Badge>
                  )}
                </div>
                {selectedContact.role && (
                  <p className="text-brand-cyan">{selectedContact.role}</p>
                )}
                {selectedContact.department && (
                  <p className="text-brand-grey-500">{selectedContact.department}</p>
                )}
                {selectedContact.reports_to && (
                  <p className="text-sm text-brand-grey-400 mt-1">
                    Reports to: {selectedContact.reports_to.first_name} {selectedContact.reports_to.last_name}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setIsContactDetailOpen(false); handleEditContact(selectedContact); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeleteClick('contact', selectedContact)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              {selectedContact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-brand-grey-400" />
                  <a href={`mailto:${selectedContact.email}`} className="text-brand-cyan hover:underline">
                    {selectedContact.email}
                  </a>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-brand-grey-400" />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-brand-grey-400" />
                  <span>{selectedContact.mobile} (mobile)</span>
                </div>
              )}
              {selectedContact.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-brand-grey-400" />
                  <a href={selectedContact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">
                    LinkedIn
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-brand-grey-200 pt-4">
              <Button variant="primary" leftIcon={<Calendar className="h-4 w-4" />} onClick={() => handleOpenAddMeeting(selectedContact)}>
                Book Meeting
              </Button>
              <Button variant="success" leftIcon={<Briefcase className="h-4 w-4" />} onClick={() => handleCreateRequirement(selectedContact)}>
                Create Requirement
              </Button>
            </div>

            {/* Meetings History */}
            <div>
              <h4 className="text-sm font-semibold text-brand-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meetings ({contactMeetings.length})
              </h4>

              {contactMeetings.length === 0 ? (
                <p className="text-sm text-brand-grey-400">No meetings scheduled with this contact</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contactMeetings.map(meeting => (
                    <div key={meeting.id} className="flex items-center gap-3 p-3 bg-brand-grey-50 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        meeting.meeting_type === 'call' ? 'bg-blue-100 text-blue-600' :
                        meeting.meeting_type === 'video' ? 'bg-purple-100 text-purple-600' :
                        meeting.meeting_type === 'in_person' ? 'bg-green-100 text-green-600' :
                        'bg-grey-100 text-grey-600'
                      }`}>
                        {meeting.meeting_type === 'call' && <Phone className="h-4 w-4" />}
                        {meeting.meeting_type === 'video' && <Globe className="h-4 w-4" />}
                        {meeting.meeting_type === 'in_person' && <MapPin className="h-4 w-4" />}
                        {meeting.meeting_type === 'email' && <Mail className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-brand-slate-900">{meeting.subject}</p>
                        {meeting.scheduled_at && (
                          <p className="text-xs text-brand-grey-400">
                            {new Date(meeting.scheduled_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedContact.notes && (
              <div>
                <h4 className="text-sm font-semibold text-brand-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <p className="text-sm text-brand-grey-600 whitespace-pre-wrap">{selectedContact.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Company Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={isEditingCompany ? 'Edit Company' : (companyForm.parent_company_id ? 'Add Location / Subcompany' : 'Add Company')}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Logo Upload */}
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {logoPreview ? (
                <div className="relative">
                  <img 
                    src={logoPreview} 
                    alt="Company logo" 
                    className="w-20 h-20 rounded-lg object-contain border border-brand-grey-200 bg-white"
                  />
                  <button
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      setCompanyForm(prev => ({ ...prev, logo_url: '' }));
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-brand-grey-300 flex items-center justify-center bg-brand-grey-50">
                  <Image className="h-8 w-8 text-brand-grey-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">
                Company Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLogoPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-sm text-brand-grey-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-brand-cyan file:text-white
                  hover:file:bg-brand-cyan/90
                  file:cursor-pointer cursor-pointer"
              />
              <p className="text-xs text-brand-grey-400 mt-1">PNG, JPG up to 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              value={companyForm.name}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Acme Corporation"
            />
            <Input
              label="Trading Name"
              value={companyForm.trading_name}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, trading_name: e.target.value }))}
              placeholder="If different from company name"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Companies House #"
              value={companyForm.companies_house_number}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, companies_house_number: e.target.value }))}
              placeholder="12345678"
            />
            <Select
              label="Industry"
              options={industryOptions}
              value={companyForm.industry}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))}
            />
            <Select
              label="Company Size"
              options={companySizeOptions}
              value={companyForm.company_size}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, company_size: e.target.value }))}
            />
          </div>

          {parentCompanies.length > 0 && (
            <Select
              label="Parent Company (leave empty if this is a parent company)"
              options={[
                { value: '', label: 'None - This is a parent company' },
                ...parentCompanies
                  .filter(c => !isEditingCompany || c.id !== selectedCompany?.id) // Can't be parent of itself
                  .map(c => ({ value: c.id, label: c.name }))
              ]}
              value={companyForm.parent_company_id}
              onChange={(e) => setCompanyForm(prev => ({ ...prev, parent_company_id: e.target.value }))}
            />
          )}

          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Address</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Address Line 1"
                value={companyForm.address_line_1}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, address_line_1: e.target.value }))}
              />
              <Input
                label="Address Line 2"
                value={companyForm.address_line_2}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, address_line_2: e.target.value }))}
              />
              <Input
                label="City"
                value={companyForm.city}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
              />
              <Input
                label="County"
                value={companyForm.county}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, county: e.target.value }))}
              />
              <Input
                label="Postcode"
                value={companyForm.postcode}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, postcode: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t border-brand-grey-200 pt-4">
            <h4 className="text-sm font-semibold text-brand-slate-900 mb-3">Contact Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Main Phone"
                value={companyForm.main_phone}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, main_phone: e.target.value }))}
              />
              <Input
                label="Main Email"
                type="email"
                value={companyForm.main_email}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, main_email: e.target.value }))}
              />
              <Input
                label="Website"
                value={companyForm.website}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://"
              />
            </div>
          </div>

          <Select
            label="Status"
            options={statusOptions}
            value={companyForm.status}
            onChange={(e) => setCompanyForm(prev => ({ ...prev, status: e.target.value }))}
          />

          <Textarea
            label="Notes"
            value={companyForm.notes}
            onChange={(e) => setCompanyForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsCompanyModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSaveCompany} isLoading={isSubmitting}>
              {isEditingCompany ? 'Save Changes' : 'Add Company'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={isEditingContact ? 'Edit Contact' : 'Add Contact'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={contactForm.first_name}
              onChange={(e) => setContactForm(prev => ({ ...prev, first_name: e.target.value }))}
            />
            <Input
              label="Last Name *"
              value={contactForm.last_name}
              onChange={(e) => setContactForm(prev => ({ ...prev, last_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role / Job Title"
              value={contactForm.role}
              onChange={(e) => setContactForm(prev => ({ ...prev, role: e.target.value }))}
              placeholder="e.g., CEO, Engineering Director, Account Manager"
            />
            <Input
              label="Department"
              value={contactForm.department}
              onChange={(e) => setContactForm(prev => ({ ...prev, department: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Reports To (Direct Manager)"
              options={[
                { value: '', label: 'No direct report (top level)' },
                ...contacts
                  .filter(c => c.id !== editingContactId) // Can't report to self
                  .map(c => ({
                    value: c.id,
                    label: `${c.first_name} ${c.last_name}${c.role ? ` (${c.role})` : ''}`
                  }))
              ]}
              value={contactForm.reports_to_id}
              onChange={(e) => setContactForm(prev => ({ ...prev, reports_to_id: e.target.value }))}
            />
            <div /> {/* Empty spacer */}
          </div>

          <Input
            label="Email"
            type="email"
            value={contactForm.email}
            onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={contactForm.phone}
              onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Mobile"
              value={contactForm.mobile}
              onChange={(e) => setContactForm(prev => ({ ...prev, mobile: e.target.value }))}
            />
          </div>

          <Input
            label="LinkedIn URL"
            value={contactForm.linkedin_url}
            onChange={(e) => setContactForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
            placeholder="https://linkedin.com/in/..."
          />

          <Textarea
            label="Notes"
            value={contactForm.notes}
            onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsContactModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSaveContact} isLoading={isSubmitting}>
              {isEditingContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Meeting Modal */}
      <Modal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        title="Book Meeting"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Subject *"
            value={meetingForm.subject}
            onChange={(e) => setMeetingForm(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="e.g., Introduction call, Requirements discussion"
          />

          <Select
            label="Meeting Type"
            options={meetingTypeOptions}
            value={meetingForm.meeting_type}
            onChange={(e) => setMeetingForm(prev => ({ ...prev, meeting_type: e.target.value }))}
          />

          {contacts.length > 0 && (
            <Select
              label="With Contact"
              options={[
                { value: '', label: 'Select contact' },
                ...contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))
              ]}
              value={meetingForm.contact_id}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, contact_id: e.target.value }))}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={meetingForm.scheduled_at}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
            />
            <Input
              label="Time"
              type="time"
              value={meetingForm.scheduled_time}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
            />
          </div>

          <Select
            label="Duration"
            options={[
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
              { value: '45', label: '45 minutes' },
              { value: '60', label: '1 hour' },
              { value: '90', label: '1.5 hours' },
              { value: '120', label: '2 hours' },
            ]}
            value={meetingForm.duration_minutes}
            onChange={(e) => setMeetingForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
          />

          {meetingForm.meeting_type === 'in_person' && (
            <Input
              label="Location"
              value={meetingForm.location}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Address or meeting room"
            />
          )}

          <Textarea
            label="Notes"
            value={meetingForm.notes}
            onChange={(e) => setMeetingForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            placeholder="Agenda, preparation notes..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsMeetingModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSaveMeeting} isLoading={isSubmitting}>
              Book Meeting
            </Button>
          </div>
        </div>
      </Modal>

      {/* Requirement Modal */}
      <Modal
        isOpen={isRequirementModalOpen}
        onClose={() => setIsRequirementModalOpen(false)}
        title="New Requirement"
        description={`Create a new requirement for ${selectedCompany?.name || 'customer'}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Name *"
              value={requirementForm.customer}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, customer: e.target.value }))}
              placeholder="e.g., BAE Systems"
            />
            <Select
              label="Industry"
              options={reqIndustryOptions}
              value={requirementForm.industry}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, industry: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="FTE Count *"
              type="number"
              min="1"
              value={requirementForm.fte_count}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, fte_count: e.target.value }))}
            />
            <Input
              label="Max Day Rate (£)"
              type="number"
              value={requirementForm.max_day_rate}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, max_day_rate: e.target.value }))}
              placeholder="550"
            />
            <Input
              label="Location"
              value={requirementForm.location}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., London, Remote"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Engineering Discipline"
              options={engineeringOptions}
              value={requirementForm.engineering_discipline}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, engineering_discipline: e.target.value }))}
            />
            <Select
              label="Clearance Required"
              options={clearanceOptions}
              value={requirementForm.clearance_required}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, clearance_required: e.target.value }))}
            />
            <Select
              label="Status"
              options={reqStatusOptions}
              value={requirementForm.status}
              onChange={(e) => setRequirementForm(prev => ({ ...prev, status: e.target.value }))}
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1">
              Required Skills
            </label>
            <Input
              placeholder="Type skill, use comma to separate, Enter to add..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
            />
            {requirementSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {requirementSkills.map(skill => (
                  <Badge key={skill} variant="cyan">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setRequirementSkills(requirementSkills.filter(s => s !== skill))}
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
            label="Description"
            value={requirementForm.description}
            onChange={(e) => setRequirementForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the requirement, project details, team structure..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => setIsRequirementModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleSaveRequirement} isLoading={isSubmitting}>
              Create Requirement
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.type === 'company' ? 'Company' : 'Contact'}`}
        message={
          deleteTarget?.type === 'company'
            ? `Are you sure you want to delete ${deleteTarget.item.name}? This will also delete all contacts and meeting history.`
            : `Are you sure you want to remove ${deleteTarget?.item.first_name} ${deleteTarget?.item.last_name}?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
        requirePassword={deleteTarget?.type === 'company'}
      />
    </div>
  );
}
