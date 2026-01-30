import { useState, useEffect } from 'react';
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
  Building2, 
  Users, 
  Search,
  ChevronRight,
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
} from 'lucide-react';
import { useToast } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { 
  companiesService, 
  contactsService, 
  customerMeetingsService,
  type DbCompany, 
  type DbContact,
  type DbCustomerMeeting,
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

const statusColours: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-grey-100 text-grey-800',
  former: 'bg-red-100 text-red-800',
};

export function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  
  // Data
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<DbCompany | null>(null);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [meetings, setMeetings] = useState<DbCustomerMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
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
  });
  
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
    } catch (error) {
      console.error('Error loading company details:', error);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Filter companies by search
  const filteredCompanies = companies.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.trading_name?.toLowerCase().includes(query) ||
      c.city?.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query)
    );
  });

  // Separate parent companies and subsidiaries
  const parentCompanies = filteredCompanies.filter(c => !c.parent_company_id);
  const getSubsidiaries = (parentId: string) => filteredCompanies.filter(c => c.parent_company_id === parentId);

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
    });
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
    });
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name) {
      toast.error('Validation Error', 'Company name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditingCompany && selectedCompany) {
        await companiesService.update(selectedCompany.id, companyForm);
        toast.success('Company Updated', 'Company details have been saved');
        loadCompanyDetails(selectedCompany.id);
      } else {
        const newCompany = await companiesService.create(companyForm);
        toast.success('Company Created', `${companyForm.name} has been added`);
        setSelectedCompany(newCompany);
      }
      setIsCompanyModalOpen(false);
      loadCompanies();
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
    });
    setIsContactModalOpen(true);
  };

  const handleEditContact = (contact: DbContact) => {
    setIsEditingContact(true);
    setEditingContactId(contact.id);
    setContactForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      job_title: contact.job_title || '',
      department: contact.department || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      linkedin_url: contact.linkedin_url || '',
      is_primary_contact: contact.is_primary_contact,
      notes: contact.notes || '',
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
      if (isEditingContact && editingContactId) {
        await contactsService.update(editingContactId, contactForm);
        toast.success('Contact Updated', 'Contact details have been saved');
      } else {
        await contactsService.create({
          ...contactForm,
          company_id: selectedCompany.id,
        });
        toast.success('Contact Added', `${contactForm.first_name} ${contactForm.last_name} has been added`);
      }
      setIsContactModalOpen(false);
      loadCompanyDetails(selectedCompany.id);
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast.error('Error', error.message || 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Meeting handlers
  const handleOpenAddMeeting = () => {
    setMeetingForm({
      contact_id: '',
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
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      toast.error('Error', error.message || 'Failed to save meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (type: 'company' | 'contact', item: any) => {
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
        setSelectedCompany(null);
        loadCompanies();
      } else {
        await contactsService.delete(deleteTarget.item.id);
        toast.success('Contact Removed', 'Contact has been removed');
        if (selectedCompany) {
          loadCompanyDetails(selectedCompany.id);
        }
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

  const handleCreateRequirement = () => {
    if (selectedCompany) {
      navigate(`/requirements/new?company_id=${selectedCompany.id}&company_name=${encodeURIComponent(selectedCompany.name)}`);
    }
  };

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
        {/* Left Sidebar - Company List */}
        <div className="w-80 border-r border-brand-grey-200 bg-white flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-brand-grey-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                {parentCompanies.map(company => (
                  <div key={company.id}>
                    {/* Parent Company */}
                    <button
                      onClick={() => loadCompanyDetails(company.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                        selectedCompany?.id === company.id 
                          ? 'bg-brand-cyan/10 text-brand-cyan' 
                          : 'hover:bg-brand-grey-100'
                      }`}
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
                    
                    {/* Subsidiaries */}
                    {getSubsidiaries(company.id).map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => loadCompanyDetails(sub.id)}
                        className={`w-full text-left p-3 pl-10 rounded-lg transition-colors flex items-center gap-3 ${
                          selectedCompany?.id === sub.id 
                            ? 'bg-brand-cyan/10 text-brand-cyan' 
                            : 'hover:bg-brand-grey-100'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-brand-grey-300" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sub.name}</p>
                          {sub.city && (
                            <p className="text-xs text-brand-grey-400 truncate">{sub.city}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-brand-grey-50">
          {selectedCompany ? (
            <div className="p-6 space-y-6">
              {/* Company Header Card */}
              <div className="bg-gradient-to-r from-brand-slate-900 to-brand-slate-800 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <Building2 className="h-8 w-8" />
                    </div>
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleEditCompany}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDeleteClick('company', selectedCompany)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="success" leftIcon={<Briefcase className="h-4 w-4" />} onClick={handleCreateRequirement}>
                  Create Requirement
                </Button>
                <Button variant="primary" leftIcon={<Calendar className="h-4 w-4" />} onClick={handleOpenAddMeeting}>
                  Book Meeting
                </Button>
                <Button variant="secondary" leftIcon={<User className="h-4 w-4" />} onClick={handleOpenAddContact}>
                  Add Contact
                </Button>
                <Button variant="secondary" leftIcon={<Building2 className="h-4 w-4" />} onClick={() => handleOpenAddCompany(selectedCompany.id)}>
                  Add Business Unit
                </Button>
              </div>
              
              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-6">
                {/* Contacts Column */}
                <div>
                  <h3 className="text-lg font-semibold text-brand-slate-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contacts ({contacts.length})
                  </h3>
                  
                  {contacts.length === 0 ? (
                    <Card className="p-6 text-center">
                      <User className="h-10 w-10 mx-auto text-brand-grey-300 mb-2" />
                      <p className="text-sm text-brand-grey-400">No contacts yet</p>
                      <Button variant="primary" size="sm" className="mt-3" onClick={handleOpenAddContact}>
                        Add First Contact
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map(contact => (
                        <Card key={contact.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Avatar name={`${contact.first_name} ${contact.last_name}`} size="md" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-brand-slate-900">
                                    {contact.first_name} {contact.last_name}
                                  </p>
                                  {contact.is_primary_contact && (
                                    <Badge variant="cyan">Primary</Badge>
                                  )}
                                </div>
                                {contact.job_title && (
                                  <p className="text-sm text-brand-grey-500">{contact.job_title}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-brand-grey-400">
                                  {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-brand-cyan">
                                      <Mail className="h-3.5 w-3.5" />
                                      {contact.email}
                                    </a>
                                  )}
                                  {contact.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3.5 w-3.5" />
                                      {contact.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditContact(contact)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteClick('contact', contact)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Meetings Column */}
                <div>
                  <h3 className="text-lg font-semibold text-brand-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Meetings ({meetings.length})
                  </h3>
                  
                  {meetings.length === 0 ? (
                    <Card className="p-6 text-center">
                      <Calendar className="h-10 w-10 mx-auto text-brand-grey-300 mb-2" />
                      <p className="text-sm text-brand-grey-400">No meetings yet</p>
                      <Button variant="primary" size="sm" className="mt-3" onClick={handleOpenAddMeeting}>
                        Book First Meeting
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {meetings.map(meeting => (
                        <Card key={meeting.id} className="p-4">
                          <div className="flex items-start gap-3">
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
                              {meeting.contact && (
                                <p className="text-sm text-brand-grey-500">
                                  with {meeting.contact.first_name} {meeting.contact.last_name}
                                </p>
                              )}
                              {meeting.scheduled_at && (
                                <p className="text-sm text-brand-grey-400 flex items-center gap-1 mt-1">
                                  <Clock className="h-3.5 w-3.5" />
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
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Subsidiaries Section */}
              {selectedCompany.subsidiaries && selectedCompany.subsidiaries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-brand-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Units / Subsidiaries
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedCompany.subsidiaries.map(sub => (
                      <Card 
                        key={sub.id} 
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => loadCompanyDetails(sub.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-brand-grey-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-brand-grey-500" />
                          </div>
                          <div>
                            <p className="font-medium text-brand-slate-900">{sub.name}</p>
                            {sub.city && (
                              <p className="text-sm text-brand-grey-400">{sub.city}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
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
      
      {/* Company Modal */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={isEditingCompany ? 'Edit Company' : (companyForm.parent_company_id ? 'Add Business Unit' : 'Add Company')}
        size="xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
          
          {!companyForm.parent_company_id && parentCompanies.length > 0 && (
            <Select
              label="Parent Company (if subsidiary)"
              options={[
                { value: '', label: 'None - This is a parent company' },
                ...parentCompanies.map(c => ({ value: c.id, label: c.name }))
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
              label="Job Title"
              value={contactForm.job_title}
              onChange={(e) => setContactForm(prev => ({ ...prev, job_title: e.target.value }))}
            />
            <Input
              label="Department"
              value={contactForm.department}
              onChange={(e) => setContactForm(prev => ({ ...prev, department: e.target.value }))}
            />
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
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={contactForm.is_primary_contact}
              onChange={(e) => setContactForm(prev => ({ ...prev, is_primary_contact: e.target.checked }))}
              className="h-4 w-4 text-brand-cyan rounded border-brand-grey-300"
            />
            <span className="text-sm text-brand-slate-700">Primary contact for this company</span>
          </label>
          
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
                { value: '', label: 'Select contact (optional)' },
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
      />
    </div>
  );
}