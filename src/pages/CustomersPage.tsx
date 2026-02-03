import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout';
import {
  Card,
  Button,
  Input,
  Select,
  SearchableSelect,
  Textarea,
  Modal,
  Badge,
  Avatar,
  ConfirmDialog,
} from '@/components/ui';
import { CreateRequirementModal } from '@/components/CreateRequirementModal';
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
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { timeOptions } from '@/lib/utils';
import {
  companiesService,
  contactsService,
  customerMeetingsService,
  customerAssessmentsService,
  applicationsService,
  requirementsService,
  type DbCompany,
  type DbContact,
  type DbCustomerMeeting,
  type DbRequirement,
  type DbApplication,
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
    is_parent: false,
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
  const [lockedMeetingContact, setLockedMeetingContact] = useState<DbContact | null>(null); // When booking from contact card
  const [meetingCategory, setMeetingCategory] = useState<'client_meeting' | 'candidate_assessment'>('client_meeting');
  const [meetingForm, setMeetingForm] = useState({
    contact_id: '',
    meeting_type: 'call',
    subject: '',
    scheduled_at: '',
    scheduled_time: '',
    duration_minutes: '30',
    location: '',
    notes: '',
    // For candidate assessment
    requirement_id: '',
    candidate_id: '',
  });
  const [requirementCandidates, setRequirementCandidates] = useState<Array<{ id: string; candidate: any }>>([]);

  // Contact detail modal
  const [isContactDetailOpen, setIsContactDetailOpen] = useState(false);
  const [contactMeetings, setContactMeetings] = useState<DbCustomerMeeting[]>([]);
  const [contactRequirements, setContactRequirements] = useState<DbRequirement[]>([]);

  // Meeting detail modal (for viewing/editing meetings from contact profile)
  const [viewingMeeting, setViewingMeeting] = useState<DbCustomerMeeting | null>(null);
  const [isMeetingDetailOpen, setIsMeetingDetailOpen] = useState(false);
  const [isMeetingStatusModalOpen, setIsMeetingStatusModalOpen] = useState(false);
  const [meetingStatusToSet, setMeetingStatusToSet] = useState<'completed' | 'cancelled' | null>(null);
  const [meetingOutcomeNotes, setMeetingOutcomeNotes] = useState('');

  // Requirement modal
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [lockedContact, setLockedContact] = useState<DbContact | null>(null); // When creating from contact profile
  const [requirementForm, setRequirementForm] = useState({
    title: '',
    contact_id: '',
    location: '',
    max_day_rate: '',
    description: '',
    status: 'active',
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

    // Load requirements for this contact
    try {
      const allRequirements = await requirementsService.getAll();
      const contactReqs = allRequirements.filter(r => r.contact_id === contact.id);
      setContactRequirements(contactReqs);
    } catch (error) {
      console.error('Error loading contact requirements:', error);
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
    // When parentId is provided, we're creating a subsidiary
    // When no parentId, we're creating a parent company
    setCompanyForm({
      name: '',
      trading_name: '',
      companies_house_number: '',
      industry: '',
      company_size: '',
      parent_company_id: parentId || '',
      is_parent: !parentId, // If no parent, this IS a parent company
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
      is_parent: !selectedCompany.parent_company_id, // Parent if no parent_company_id
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
    
    // If contact provided, lock it (coming from contact card)
    setLockedMeetingContact(contact || null);
    setMeetingCategory('client_meeting');
    setRequirementCandidates([]);
    
    setMeetingForm({
      contact_id: contact?.id || '',
      meeting_type: 'call',
      subject: '',
      scheduled_at: '',
      scheduled_time: '',
      duration_minutes: '30',
      location: '',
      notes: '',
      requirement_id: '',
      candidate_id: '',
    });
    setIsMeetingModalOpen(true);
  };

  // View meeting detail from contact profile
  const handleViewMeeting = (meeting: DbCustomerMeeting) => {
    setViewingMeeting(meeting);
    setIsMeetingDetailOpen(true);
  };

  // Open status change modal
  const handleOpenMeetingStatusModal = (status: 'completed' | 'cancelled') => {
    setMeetingStatusToSet(status);
    setMeetingOutcomeNotes('');
    setIsMeetingStatusModalOpen(true);
  };

  // Update meeting status
  const handleUpdateMeetingStatus = async () => {
    if (!viewingMeeting || !meetingStatusToSet) return;
    
    setIsSubmitting(true);
    try {
      await customerMeetingsService.updateStatus(
        viewingMeeting.id,
        meetingStatusToSet,
        meetingOutcomeNotes || undefined
      );
      
      toast.success(
        meetingStatusToSet === 'completed' ? 'Meeting Completed' : 'Meeting Cancelled',
        meetingStatusToSet === 'completed' 
          ? 'Meeting has been marked as completed' 
          : 'Meeting has been cancelled'
      );
      
      // Reload contact meetings
      if (selectedContact) {
        const allMeetings = await customerMeetingsService.getAll();
        const updatedMeetings = allMeetings.filter(m => m.contact_id === selectedContact.id);
        setContactMeetings(updatedMeetings);
      }
      
      setIsMeetingStatusModalOpen(false);
      setIsMeetingDetailOpen(false);
      setViewingMeeting(null);
      setMeetingStatusToSet(null);
      setMeetingOutcomeNotes('');
    } catch (error) {
      console.error('Error updating meeting status:', error);
      toast.error('Error', 'Failed to update meeting status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load candidates when requirement is selected
  const handleRequirementSelectForMeeting = async (requirementId: string) => {
    setMeetingForm(prev => ({ ...prev, requirement_id: requirementId, candidate_id: '' }));
    setRequirementCandidates([]);
    
    if (requirementId) {
      try {
        const applications = await applicationsService.getByRequirement(requirementId);
        // Only show candidates that have progressed (not rejected)
        const validApplications = applications.filter(app => 
          app.status !== 'rejected' && app.candidate
        );
        setRequirementCandidates(validApplications.map(app => ({
          id: app.id,
          candidate: app.candidate,
        })));
      } catch (error) {
        console.error('Error loading candidates:', error);
      }
    }
  };

  const handleSaveMeeting = async () => {
    // Subject only required for client meetings
    if (meetingCategory === 'client_meeting' && !meetingForm.subject) {
      toast.error('Validation Error', 'Subject is required');
      return;
    }
    if (!selectedCompany) return;

    // Validation for candidate assessment
    if (meetingCategory === 'candidate_assessment') {
      if (!meetingForm.requirement_id) {
        toast.error('Validation Error', 'Please select a requirement');
        return;
      }
      if (!meetingForm.candidate_id) {
        toast.error('Validation Error', 'Please select a candidate');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (meetingCategory === 'client_meeting') {
        // Create customer meeting
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
        toast.success('Meeting Scheduled', 'Client meeting has been booked');
      } else {
        // Create candidate assessment
        const selectedApp = requirementCandidates.find(rc => rc.id === meetingForm.candidate_id);
        const candidateName = selectedApp?.candidate 
          ? `${selectedApp.candidate.first_name} ${selectedApp.candidate.last_name?.charAt(0)}.`
          : 'Candidate';
        const requirementTitle = requirements.find(r => r.id === meetingForm.requirement_id)?.title || 
                                 requirements.find(r => r.id === meetingForm.requirement_id)?.customer ||
                                 'Requirement';
        
        // Auto-generate title: "Requirement - Candidate F."
        const autoTitle = `${requirementTitle} - ${candidateName}`;
        
        await customerAssessmentsService.create({
          application_id: meetingForm.candidate_id, // This is actually the application ID
          contact_id: lockedMeetingContact?.id || meetingForm.contact_id || undefined,
          scheduled_date: meetingForm.scheduled_at,
          scheduled_time: meetingForm.scheduled_time || undefined,
          location: meetingForm.location || undefined,
          notes: meetingForm.subject && meetingForm.subject !== 'Technical Assessment' 
            ? `${meetingForm.subject}${meetingForm.notes ? '\n\n' + meetingForm.notes : ''}` 
            : `${autoTitle}${meetingForm.notes ? '\n\n' + meetingForm.notes : ''}`,
          created_by: user?.id,
        });
        toast.success('Assessment Scheduled', 'Candidate assessment has been booked');
      }
      
      setIsMeetingModalOpen(false);
      setLockedMeetingContact(null);
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
      // If contact provided, lock it (coming from contact profile)
      setLockedContact(contact || null);
      
      setRequirementForm({
        title: '',
        contact_id: contact?.id || '',
        location: selectedCompany.city || '',
        max_day_rate: '',
        description: '',
        status: 'active',
        clearance_required: 'none',
        engineering_discipline: 'software',
      });
      setRequirementSkills([]);
      setSkillInput('');
      setIsRequirementModalOpen(true);
    }
  };

  const handleSaveRequirement = async () => {
    if (!requirementForm.title) {
      toast.error('Validation Error', 'Please enter a title');
      return;
    }
    if (!requirementForm.contact_id) {
      toast.error('Validation Error', 'Please select a contact');
      return;
    }
    if (!selectedCompany) return;

    const selectedReqContact = contacts.find(c => c.id === requirementForm.contact_id);

    setIsSubmitting(true);
    try {
      await requirementsService.create({
        title: requirementForm.title,
        customer: selectedCompany.name,
        company_id: selectedCompany.id,
        contact_id: requirementForm.contact_id,
        industry: selectedCompany.industry || undefined,
        location: requirementForm.location || undefined,
        max_day_rate: requirementForm.max_day_rate ? parseInt(requirementForm.max_day_rate) : undefined,
        description: requirementForm.description || undefined,
        status: requirementForm.status,
        clearance_required: requirementForm.clearance_required,
        engineering_discipline: requirementForm.engineering_discipline,
        skills: requirementSkills.length > 0 ? requirementSkills : undefined,
        created_by: user?.id,
      });
      
      toast.success('Requirement Created', `"${requirementForm.title}" has been created`);
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
    { id: 'locations' as TabType, label: 'Subsidiaries', icon: FolderTree, count: selectedCompany?.subsidiaries?.length || getSubsidiaries(selectedCompany?.id || '').length },
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
                        {selectedCompany.reference_id && (
                          <span className="text-xs text-white/50">ID: {selectedCompany.reference_id}</span>
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
                {/* Only show Add Contact for subsidiaries (companies with a parent) */}
                {selectedCompany.parent_company_id && (
                  <Button variant="secondary" leftIcon={<User className="h-4 w-4" />} onClick={handleOpenAddContact}>
                    Add Contact
                  </Button>
                )}
                {/* Only show Add Subsidiary for parent companies (no parent_company_id) */}
                {!selectedCompany.parent_company_id && (
                  <Button variant="success" leftIcon={<Building2 className="h-4 w-4" />} onClick={() => handleOpenAddCompany(selectedCompany.id)}>
                    Add Subsidiary
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <div className="border-b border-brand-grey-200">
                <div className="flex gap-1">
                  {tabs.map(tab => {
                    // Hide Locations tab for subcompanies (subsidiaries don't have sub-subsidiaries)
                    if (tab.id === 'locations' && selectedCompany.parent_company_id) return null;
                    
                    // Hide Org Chart tab for parent companies (org charts are on subsidiaries where contacts live)
                    if (tab.id === 'org-chart' && !selectedCompany.parent_company_id) return null;

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
                        {!selectedCompany.parent_company_id ? (
                          <>
                            <p className="text-brand-grey-500">No contacts from subsidiaries yet</p>
                            <p className="text-brand-grey-400 text-sm mt-1">
                              Add subsidiaries and their contacts to see them here.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-brand-grey-500">No contacts yet</p>
                            <Button variant="primary" size="sm" className="mt-4" onClick={handleOpenAddContact}>
                              Add First Contact
                            </Button>
                          </>
                        )}
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
                            <p className="text-brand-grey-500">No subsidiaries yet</p>
                            <Button
                              variant="success"
                              size="sm"
                              className="mt-4"
                              onClick={() => handleOpenAddCompany(selectedCompany.id)}
                            >
                              Add First Subsidiary
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
                {selectedContact.reference_id && (
                  <p className="text-xs text-brand-grey-400 mt-1">ID: {selectedContact.reference_id}</p>
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

            {/* Requirements Stats */}
            {contactRequirements.length > 0 && (() => {
              const total = contactRequirements.length;
              const active = contactRequirements.filter(r => r.status === 'active' || r.status === 'opportunity').length;
              const won = contactRequirements.filter(r => r.status === 'filled' || r.status === 'won').length;
              const lost = contactRequirements.filter(r => r.status === 'lost' || r.status === 'cancelled').length;
              const closed = won + lost;
              const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : null;
              
              // WP (Work Package / Fixed Price) bids won
              const wpBidsWon = contactRequirements.filter(r => 
                (r.status === 'filled' || r.status === 'won') && 
                r.project_type === 'Fixed_Price' && 
                r.is_bid
              ).length;
              
              // T&M requirements won
              const tmWon = contactRequirements.filter(r => 
                (r.status === 'filled' || r.status === 'won') && 
                r.project_type === 'T&M'
              ).length;
              
              return (
                <div className="flex items-center gap-4 py-3 px-4 bg-brand-grey-50 rounded-lg">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-brand-slate-900">{total}</p>
                      <p className="text-xs text-brand-grey-500">Total</p>
                    </div>
                    <div className="h-8 w-px bg-brand-grey-200" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-amber-600">{active}</p>
                      <p className="text-xs text-brand-grey-500">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">{won}</p>
                      <p className="text-xs text-brand-grey-500">Won</p>
                    </div>
                    {wpBidsWon > 0 && (
                      <div className="text-center" title="Fixed Price / Work Package bids won">
                        <p className="text-lg font-semibold text-blue-600">{wpBidsWon}</p>
                        <p className="text-xs text-brand-grey-500">WP Bids</p>
                      </div>
                    )}
                    {tmWon > 0 && (
                      <div className="text-center" title="Time & Materials requirements won">
                        <p className="text-lg font-semibold text-cyan-600">{tmWon}</p>
                        <p className="text-xs text-brand-grey-500">T&M Won</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-lg font-semibold text-red-500">{lost}</p>
                      <p className="text-xs text-brand-grey-500">Lost</p>
                    </div>
                  </div>
                  {conversionRate !== null && (
                    <>
                      <div className="h-8 w-px bg-brand-grey-200" />
                      <div className="text-center px-3">
                        <p className={`text-lg font-semibold ${conversionRate >= 50 ? 'text-green-600' : conversionRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                          {conversionRate}%
                        </p>
                        <p className="text-xs text-brand-grey-500">Win Rate</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Requirements List */}
            <div>
              <h4 className="text-sm font-semibold text-brand-slate-900 mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Requirements ({contactRequirements.length})
              </h4>

              {contactRequirements.length === 0 ? (
                <p className="text-sm text-brand-grey-400">No requirements from this contact</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contactRequirements.map(req => {
                    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                      opportunity: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Opportunity' },
                      active: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Active' },
                      on_hold: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'On Hold' },
                      filled: { bg: 'bg-green-100', text: 'text-green-700', label: 'Won' },
                      won: { bg: 'bg-green-100', text: 'text-green-700', label: 'Won' },
                      lost: { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost' },
                      cancelled: { bg: 'bg-grey-100', text: 'text-grey-700', label: 'Cancelled' },
                    };
                    const config = statusConfig[req.status] || statusConfig.opportunity;
                    
                    return (
                      <div 
                        key={req.id} 
                        className="flex items-center gap-3 p-3 bg-brand-grey-50 rounded-lg hover:bg-brand-grey-100 cursor-pointer transition-colors"
                        onClick={() => {
                          setIsContactDetailOpen(false);
                          window.location.href = `/requirements/${req.id}`;
                        }}
                      >
                        <div className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brand-slate-900 truncate">
                            {req.title || req.customer}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-brand-grey-400">
                            {req.reference_id && <span>{req.reference_id}</span>}
                            {req.location && <span>· {req.location}</span>}
                            {req.max_day_rate && <span>· £{req.max_day_rate}/day</span>}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-brand-grey-400" />
                      </div>
                    );
                  })}
                </div>
              )}
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
                  {contactMeetings.map(meeting => {
                    const status = (meeting as any).status || 'planned';
                    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                      planned: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Planned' },
                      completed: { bg: 'bg-green-100', text: 'text-green-600', label: 'Completed' },
                      cancelled: { bg: 'bg-red-100', text: 'text-red-500', label: 'Cancelled' },
                    };
                    const config = statusConfig[status] || statusConfig.planned;
                    
                    return (
                      <div 
                        key={meeting.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-brand-grey-100 ${
                          status === 'cancelled' ? 'bg-red-50 opacity-75' : 'bg-brand-grey-50'
                        }`}
                        onClick={() => handleViewMeeting(meeting)}
                      >
                        <div className={`p-2 rounded-lg ${
                          status === 'completed' ? 'bg-green-100 text-green-600' :
                          status === 'cancelled' ? 'bg-red-100 text-red-500' :
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${status === 'cancelled' ? 'text-brand-grey-500 line-through' : 'text-brand-slate-900'}`}>
                              {meeting.subject}
                            </p>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                          </div>
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
                        <ChevronRight className="h-4 w-4 text-brand-grey-400 flex-shrink-0" />
                      </div>
                    );
                  })}
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
        title={isEditingCompany ? 'Edit Company' : (companyForm.parent_company_id ? 'Add Subsidiary' : 'Add Company')}
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
            <div>
              <Input
                label="Companies House #"
                value={companyForm.companies_house_number}
                onChange={(e) => setCompanyForm(prev => ({ ...prev, companies_house_number: e.target.value }))}
                placeholder="12345678"
              />
              {companyForm.parent_company_id && (
                <p className="text-xs text-brand-grey-400 mt-1">Leave as parent's if the same</p>
              )}
            </div>
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

          {/* Only show address, contact info and status for subsidiaries */}
          {companyForm.parent_company_id && (
            <>
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
            </>
          )}

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
        onClose={() => { setIsMeetingModalOpen(false); setLockedMeetingContact(null); setMeetingCategory('client_meeting'); setRequirementCandidates([]); }}
        title="Book Meeting"
        description={lockedMeetingContact ? `Schedule a meeting with ${lockedMeetingContact.first_name} ${lockedMeetingContact.last_name}` : undefined}
        size="lg"
      >
        <div className="space-y-4">
          {/* Contact - locked if coming from contact card */}
          {lockedMeetingContact ? (
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
                With Contact
              </label>
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-brand-grey-200 bg-brand-grey-50">
                <Avatar name={`${lockedMeetingContact.first_name} ${lockedMeetingContact.last_name}`} size="sm" />
                <div>
                  <span className="font-medium text-brand-slate-900">
                    {lockedMeetingContact.first_name} {lockedMeetingContact.last_name}
                  </span>
                  {lockedMeetingContact.role && (
                    <span className="text-sm text-brand-grey-500 ml-2">{lockedMeetingContact.role}</span>
                  )}
                </div>
              </div>
            </div>
          ) : contacts.length > 0 ? (
            <SearchableSelect
              label="With Contact"
              placeholder="Type to search contacts..."
              options={contacts.map(c => ({ 
                value: c.id, 
                label: `${c.first_name} ${c.last_name}`,
                sublabel: c.role || undefined
              }))}
              value={meetingForm.contact_id}
              onChange={(val) => setMeetingForm(prev => ({ ...prev, contact_id: val }))}
            />
          ) : null}

          {/* Meeting Category Toggle */}
          <div>
            <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
              Meeting Category
            </label>
            <div className="flex gap-2 p-1 bg-brand-grey-100 rounded-lg">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  meetingCategory === 'client_meeting' 
                    ? 'bg-white text-brand-slate-900 shadow-sm' 
                    : 'text-brand-grey-500 hover:text-brand-slate-700'
                }`}
                onClick={() => {
                  setMeetingCategory('client_meeting');
                  setMeetingForm(prev => ({ ...prev, requirement_id: '', candidate_id: '' }));
                  setRequirementCandidates([]);
                }}
              >
                Client Meeting
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  meetingCategory === 'candidate_assessment' 
                    ? 'bg-white text-brand-slate-900 shadow-sm' 
                    : 'text-brand-grey-500 hover:text-brand-slate-700'
                }`}
                onClick={() => setMeetingCategory('candidate_assessment')}
              >
                Candidate Assessment
              </button>
            </div>
          </div>

          {/* Candidate Assessment fields */}
          {meetingCategory === 'candidate_assessment' && (
            <>
              {/* Requirement selector (dropdown) - only requirements for this contact */}
              {(() => {
                const contactId = lockedMeetingContact?.id || meetingForm.contact_id;
                const contactReqs = requirements.filter(r => r.contact_id === contactId);
                return contactReqs.length > 0 ? (
                  <Select
                    label="Requirement *"
                    options={[
                      { value: '', label: 'Select Requirement' },
                      ...contactReqs.map(r => ({
                        value: r.id,
                        label: `${r.title || r.customer}${r.location ? ` - ${r.location}` : ''}${r.reference_id ? ` [${r.reference_id}]` : ''}`
                      }))
                    ]}
                    value={meetingForm.requirement_id}
                    onChange={(e) => handleRequirementSelectForMeeting(e.target.value)}
                  />
                ) : (
                  <div className="p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-lg">
                    <p className="text-sm text-brand-orange">
                      No requirements found for this contact. Create a requirement first.
                    </p>
                  </div>
                );
              })()}

              {/* Candidate selector (dropdown) - only candidates linked to selected requirement */}
              {meetingForm.requirement_id && (
                requirementCandidates.length > 0 ? (
                  <Select
                    label="Candidate *"
                    options={[
                      { value: '', label: 'Select Candidate' },
                      ...requirementCandidates.map(rc => ({
                        value: rc.id,
                        label: `${rc.candidate?.first_name} ${rc.candidate?.last_name}${rc.candidate?.reference_id ? ` [${rc.candidate.reference_id}]` : ''}`
                      }))
                    ]}
                    value={meetingForm.candidate_id}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, candidate_id: e.target.value }))}
                  />
                ) : (
                  <div className="p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-lg">
                    <p className="text-sm text-brand-orange">
                      No candidates linked to this requirement yet. Add candidates to the requirement first.
                    </p>
                  </div>
                )
              )}
            </>
          )}

          {/* Subject only for client meetings - assessments get auto-generated title */}
          {meetingCategory === 'client_meeting' && (
            <Input
              label="Subject / Title *"
              value={meetingForm.subject}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g., Introduction call, Requirements discussion"
            />
          )}

          {meetingCategory === 'client_meeting' && (
            <Select
              label="Meeting Type"
              options={meetingTypeOptions}
              value={meetingForm.meeting_type}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, meeting_type: e.target.value }))}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={meetingForm.scheduled_at}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
            />
            <Select
              label="Time"
              options={timeOptions}
              value={meetingForm.scheduled_time}
              onChange={(e) => setMeetingForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
              placeholder="Select time"
            />
          </div>

          {meetingCategory === 'client_meeting' && (
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
          )}

          <Input
            label="Location"
            value={meetingForm.location}
            onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder={meetingCategory === 'candidate_assessment' ? "Customer office address" : "Address or meeting room"}
          />

          <Textarea
            label="Notes"
            value={meetingForm.notes}
            onChange={(e) => setMeetingForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            placeholder="Agenda, preparation notes..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => { setIsMeetingModalOpen(false); setLockedMeetingContact(null); }}>Cancel</Button>
            <Button variant="success" onClick={handleSaveMeeting} isLoading={isSubmitting}>
              {meetingCategory === 'client_meeting' ? 'Book Meeting' : 'Schedule Assessment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Requirement Modal - using shared component */}
      <CreateRequirementModal
        isOpen={isRequirementModalOpen}
        onClose={() => { setIsRequirementModalOpen(false); setLockedContact(null); }}
        onSuccess={async () => {
          if (selectedCompany) {
            await loadCompanyDetails(selectedCompany.id);
          }
        }}
        company={selectedCompany || undefined}
        contact={lockedContact || undefined}
        allContacts={contacts}
        allCompanies={companies}
      />

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

      {/* Meeting Detail Modal */}
      {viewingMeeting && (
        <Modal
          isOpen={isMeetingDetailOpen}
          onClose={() => { setIsMeetingDetailOpen(false); setViewingMeeting(null); }}
          title="Meeting Details"
          size="lg"
        >
          {(() => {
            const contact = contacts.find(c => c.id === viewingMeeting.contact_id);
            const company = selectedCompany;
            const status = (viewingMeeting as any).status || 'planned';
            const meetingTypeLabels: Record<string, string> = {
              call: 'Phone Call', video: 'Video Call', in_person: 'In Person', email: 'Email',
            };

            return (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${status === 'completed' ? 'bg-green-100' : status === 'cancelled' ? 'bg-red-100' : 'bg-brand-cyan/10'}`}>
                      <Phone className={`h-6 w-6 ${status === 'completed' ? 'text-green-600' : status === 'cancelled' ? 'text-red-500' : 'text-brand-cyan'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-brand-slate-900">{viewingMeeting.subject}</h3>
                      <p className="text-sm text-brand-grey-500">{meetingTypeLabels[viewingMeeting.meeting_type] || viewingMeeting.meeting_type}</p>
                    </div>
                  </div>
                  <Badge variant={status === 'completed' ? 'green' : status === 'cancelled' ? 'red' : 'cyan'}>{status === 'completed' ? 'Completed' : status === 'cancelled' ? 'Cancelled' : 'Planned'}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-brand-grey-50 rounded-lg">
                  {contact && <div><p className="text-xs text-brand-grey-400">Contact</p><p className="font-medium text-brand-slate-900">{contact.first_name} {contact.last_name}</p></div>}
                  {company && <div><p className="text-xs text-brand-grey-400">Company</p><p className="font-medium text-brand-slate-900">{company.name}</p></div>}
                  <div><p className="text-xs text-brand-grey-400">Date & Time</p><p className="font-medium text-brand-slate-900">{viewingMeeting.scheduled_at ? new Date(viewingMeeting.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}</p></div>
                  <div><p className="text-xs text-brand-grey-400">Duration</p><p className="font-medium text-brand-slate-900">{viewingMeeting.duration_minutes ? `${viewingMeeting.duration_minutes} minutes` : 'Not specified'}</p></div>
                  {viewingMeeting.location && <div className="col-span-2"><p className="text-xs text-brand-grey-400">Location</p><p className="font-medium text-brand-slate-900">{viewingMeeting.location}</p></div>}
                </div>

                {(viewingMeeting as any).preparation_notes && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Preparation Notes</h4>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{(viewingMeeting as any).preparation_notes}</p>
                  </div>
                )}

                {(viewingMeeting as any).outcome_notes && (
                  <div className={`p-4 rounded-lg border ${status === 'completed' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <h4 className={`font-medium mb-2 flex items-center gap-2 ${status === 'completed' ? 'text-green-900' : 'text-red-900'}`}>
                      {status === 'completed' ? <><CheckCircle className="h-4 w-4" />Meeting Outcome</> : <><XCircle className="h-4 w-4" />Cancellation Reason</>}
                    </h4>
                    <p className={`text-sm whitespace-pre-wrap ${status === 'completed' ? 'text-green-800' : 'text-red-800'}`}>{(viewingMeeting as any).outcome_notes}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-brand-grey-200">
                  {status === 'planned' && (
                    <>
                      <Button variant="danger" size="sm" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => handleOpenMeetingStatusModal('cancelled')}>Cancel Meeting</Button>
                      <Button variant="success" size="sm" leftIcon={<CheckCircle className="h-4 w-4" />} onClick={() => handleOpenMeetingStatusModal('completed')}>Mark Complete</Button>
                    </>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => { setIsMeetingDetailOpen(false); setViewingMeeting(null); }}>Close</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Meeting Status Update Modal */}
      <Modal
        isOpen={isMeetingStatusModalOpen}
        onClose={() => { setIsMeetingStatusModalOpen(false); setMeetingStatusToSet(null); setMeetingOutcomeNotes(''); }}
        title={meetingStatusToSet === 'completed' ? 'Complete Meeting' : 'Cancel Meeting'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-brand-grey-600">
            {meetingStatusToSet === 'completed' ? 'Add notes about the meeting outcome and key takeaways.' : 'Please provide a reason for cancelling this meeting.'}
          </p>
          <Textarea
            label={meetingStatusToSet === 'completed' ? 'Meeting Outcome / Takeaways' : 'Cancellation Reason'}
            value={meetingOutcomeNotes}
            onChange={(e) => setMeetingOutcomeNotes(e.target.value)}
            placeholder={meetingStatusToSet === 'completed' ? 'What was discussed? What are the next steps?' : 'Why is this meeting being cancelled?'}
            rows={4}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-grey-200">
            <Button variant="secondary" onClick={() => { setIsMeetingStatusModalOpen(false); setMeetingStatusToSet(null); setMeetingOutcomeNotes(''); }}>Cancel</Button>
            <Button
              variant={meetingStatusToSet === 'completed' ? 'success' : 'danger'}
              leftIcon={meetingStatusToSet === 'completed' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              onClick={handleUpdateMeetingStatus}
              isLoading={isSubmitting}
            >
              {meetingStatusToSet === 'completed' ? 'Mark as Complete' : 'Cancel Meeting'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
