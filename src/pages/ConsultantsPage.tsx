import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Users, 
  Search,
  Building2,
  Calendar,
  PoundSterling,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Shield,
  Flag,
  Briefcase,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle,
  Button, 
  Input,
  Badge,
  Avatar,
  EmptyState,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { consultantsService, type DbConsultant } from '@/lib/services';
import type { BadgeVariant } from '@/components/ui/Badge';

const statusConfig: Record<string, { label: string; colour: BadgeVariant }> = {
  bench: { label: 'Bench', colour: 'amber' },
  in_mission: { label: 'In Mission', colour: 'green' },
  on_leave: { label: 'On Leave', colour: 'blue' },
  terminated: { label: 'Terminated', colour: 'red' },
};

export function ConsultantsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [consultants, setConsultants] = useState<DbConsultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await consultantsService.getAll();
      setConsultants(data);
    } catch (error) {
      console.error('Error loading consultants:', error);
      toast.error('Error', 'Failed to load consultants');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter consultants
  const filteredConsultants = consultants.filter(consultant => {
    const matchesSearch = searchQuery === '' || 
      `${consultant.first_name} ${consultant.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consultant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consultant.reference_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consultant.job_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || consultant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: consultants.length,
    bench: consultants.filter(c => c.status === 'bench').length,
    inMission: consultants.filter(c => c.status === 'in_mission').length,
    onLeave: consultants.filter(c => c.status === 'on_leave').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Consultants" />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading consultants...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Consultants" 
        subtitle={`${stats.total} consultants in the company`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-brand-cyan' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-cyan/10 rounded-lg">
                <Users className="h-5 w-5 text-brand-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.total}</p>
                <p className="text-sm text-brand-grey-400">Total Consultants</p>
              </div>
            </div>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'bench' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setStatusFilter('bench')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.bench}</p>
                <p className="text-sm text-brand-grey-400">On Bench</p>
              </div>
            </div>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'in_mission' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter('in_mission')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.inMission}</p>
                <p className="text-sm text-brand-grey-400">In Mission</p>
              </div>
            </div>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'on_leave' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter('on_leave')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.onLeave}</p>
                <p className="text-sm text-brand-grey-400">On Leave</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey-400" />
            <Input
              placeholder="Search consultants by name, email, ID, or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Consultants List */}
        {filteredConsultants.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No consultants found"
            description={searchQuery || statusFilter !== 'all' ? "Try adjusting your search or filters" : "Consultants will appear here once candidates are converted"}
          />
        ) : (
          <div className="space-y-3">
            {filteredConsultants.map(consultant => {
              const status = statusConfig[consultant.status] || statusConfig.bench;
              
              return (
                <Card 
                  key={consultant.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/consultants/${consultant.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="lg" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-brand-slate-900">
                          {consultant.first_name} {consultant.last_name}
                        </h3>
                        <Badge variant={status.colour}>{status.label}</Badge>
                        {consultant.reference_id && (
                          <span className="text-xs text-brand-grey-400">{consultant.reference_id}</span>
                        )}
                      </div>
                      
                      <p className="text-sm text-brand-grey-500 mb-2">{consultant.job_title || 'Consultant'}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                        {consultant.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {consultant.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Started {formatDate(consultant.start_date)}
                        </span>
                        {consultant.salary_amount && (
                          <span className="flex items-center gap-1">
                            <PoundSterling className="h-3.5 w-3.5" />
                            £{consultant.salary_amount.toLocaleString()}/year
                          </span>
                        )}
                        {consultant.day_rate && (
                          <span className="flex items-center gap-1">
                            <PoundSterling className="h-3.5 w-3.5" />
                            £{consultant.day_rate}/day
                          </span>
                        )}
                        {consultant.nationalities && consultant.nationalities.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Flag className="h-3.5 w-3.5" />
                            {consultant.nationalities.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button variant="secondary" size="sm">
                      View Profile
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Consultant Profile Page
export function ConsultantProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [consultant, setConsultant] = useState<DbConsultant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await consultantsService.getById(id!);
      setConsultant(data);
    } catch (error) {
      console.error('Error loading consultant:', error);
      toast.error('Error', 'Failed to load consultant');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Loading..." />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading consultant...</div>
          </Card>
        </div>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="min-h-screen">
        <Header title="Consultant Not Found" />
        <div className="p-6">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Consultant not found"
            description="The consultant you're looking for doesn't exist or has been removed."
            action={{ label: 'Back to Consultants', onClick: () => navigate('/consultants') }}
          />
        </div>
      </div>
    );
  }

  const status = statusConfig[consultant.status] || statusConfig.bench;

  return (
    <div className="min-h-screen">
      <Header
        title="Consultant Profile"
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/consultants')}
          >
            Back
          </Button>
        }
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Avatar name={`${consultant.first_name} ${consultant.last_name}`} size="xl" />
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-brand-slate-900">
                  {consultant.first_name} {consultant.last_name}
                </h1>
                <Badge variant={status.colour}>{status.label}</Badge>
              </div>
              <p className="text-brand-grey-500 mb-1">{consultant.job_title || 'Consultant'}</p>
              {consultant.reference_id && (
                <p className="text-xs text-brand-grey-400">ID: {consultant.reference_id}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:border-l md:border-brand-grey-200 md:pl-6">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-brand-grey-400" />
                <a href={`mailto:${consultant.email}`} className="text-brand-cyan hover:underline">
                  {consultant.email}
                </a>
              </div>
              {consultant.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-brand-grey-400" />
                  <span className="text-brand-slate-700">{consultant.phone}</span>
                </div>
              )}
              {consultant.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-brand-grey-400" />
                  <span className="text-brand-slate-700">{consultant.location}</span>
                </div>
              )}
              {consultant.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin className="h-4 w-4 text-brand-grey-400" />
                  <a href={consultant.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {consultant.skills && consultant.skills.length > 0 && (
            <div className="mt-6 pt-6 border-t border-brand-grey-200">
              <h3 className="text-sm font-medium text-brand-slate-700 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {consultant.skills.map((skill, idx) => (
                  <Badge key={idx} variant="grey">{skill}</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mission History */}
            <Card>
              <CardHeader>
                <CardTitle>Mission History</CardTitle>
              </CardHeader>
              <div className="text-center py-8 text-brand-grey-400">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No missions yet</p>
                <p className="text-sm">Mission history will appear here once the consultant is assigned to projects.</p>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Contract Type</p>
                    <p className="text-sm font-medium text-brand-slate-900 capitalize">
                      {consultant.contract_type?.replace(/_/g, ' ') || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                {consultant.salary_amount && (
                  <div className="flex items-start gap-3">
                    <PoundSterling className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Annual Salary</p>
                      <p className="text-sm font-medium text-brand-slate-900">
                        £{consultant.salary_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {consultant.day_rate && (
                  <div className="flex items-start gap-3">
                    <PoundSterling className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Day Rate</p>
                      <p className="text-sm font-medium text-brand-slate-900">
                        £{consultant.day_rate}/day
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-brand-grey-400">Start Date</p>
                    <p className="text-sm font-medium text-brand-slate-900">
                      {formatDate(consultant.start_date)}
                    </p>
                  </div>
                </div>
                
                {consultant.end_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-grey-400">End Date</p>
                      <p className="text-sm font-medium text-brand-slate-900">
                        {formatDate(consultant.end_date)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {consultant.security_vetting && (
                  <div className="flex items-start gap-3">
                    <Shield className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Security Clearance</p>
                      <p className="text-sm font-medium text-brand-slate-900 uppercase">
                        {consultant.security_vetting}
                      </p>
                    </div>
                  </div>
                )}
                
                {consultant.nationalities && consultant.nationalities.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Flag className="h-4 w-4 text-brand-grey-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-grey-400">Nationality</p>
                      <p className="text-sm font-medium text-brand-slate-900">
                        {consultant.nationalities.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Record Info */}
            <Card>
              <CardHeader>
                <CardTitle>Record Info</CardTitle>
              </CardHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-grey-400">Created</span>
                  <span className="text-brand-slate-700">{formatDate(consultant.created_at)}</span>
                </div>
                {consultant.candidate_id && (
                  <div className="flex justify-between">
                    <span className="text-brand-grey-400">Original Candidate</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/candidates/${consultant.candidate_id}`)}
                    >
                      View
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
