import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, getStatusVariant, Avatar, Skeleton } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatRelativeTime, statusLabels } from '@/lib/utils';
import type { DashboardStats, Candidate, Interview } from '@/types';

// Mock data for demonstration
const mockStats: DashboardStats = {
  total_candidates: 247,
  candidates_this_month: 34,
  active_requirements: 12,
  interviews_scheduled: 8,
  offers_pending: 3,
  hires_this_month: 5,
};

const mockRecentCandidates: Partial<Candidate>[] = [
  { id: '1', first_name: 'Sarah', last_name: 'Chen', current_role: 'Senior Software Engineer', status: 'technical_interview', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '2', first_name: 'James', last_name: 'Wilson', current_role: 'DevOps Lead', status: 'phone_qualification', created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: '3', first_name: 'Priya', last_name: 'Patel', current_role: 'Data Engineer', status: 'new', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', first_name: 'Michael', last_name: 'Brown', current_role: 'Systems Architect', status: 'director_interview', created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
];

const mockUpcomingInterviews: Partial<Interview & { candidate_name: string; requirement_title: string }>[] = [
  { id: '1', candidate_name: 'Sarah Chen', requirement_title: 'Senior Backend Developer', stage: 'technical_interview', scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
  { id: '2', candidate_name: 'Michael Brown', requirement_title: 'Cloud Architect', stage: 'director_interview', scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
  { id: '3', candidate_name: 'James Wilson', requirement_title: 'DevOps Engineer', stage: 'phone_qualification', scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Role-based permissions
  const canAddCandidates = ['admin', 'recruiter', 'manager'].includes(user?.role || '');
  const canCreateRequirements = ['admin', 'manager', 'director'].includes(user?.role || '');
  const canApproveContracts = ['admin', 'director'].includes(user?.role || '');
  const canManageOrganisation = user?.role === 'admin';

  return (
    <div className="min-h-screen">
      <Header 
        title={`${getGreeting()}, ${user?.full_name?.split(' ')[0] || 'there'}`}
        subtitle="Here's what's happening with your recruitment pipeline"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Candidates"
            value={mockStats.total_candidates}
            change={`+${mockStats.candidates_this_month} this month`}
            changeType="positive"
            isLoading={isLoading}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Active Requirements"
            value={mockStats.active_requirements}
            change="3 urgent"
            changeType="warning"
            isLoading={isLoading}
          />
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Interviews Scheduled"
            value={mockStats.interviews_scheduled}
            change="This week"
            changeType="neutral"
            isLoading={isLoading}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Hires This Month"
            value={mockStats.hires_this_month}
            change={`${mockStats.offers_pending} offers pending`}
            changeType="positive"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Candidates */}
          <Card padding="none" className="lg:col-span-2">
            <CardHeader className="p-6 pb-0">
              <CardTitle>Recent Candidates</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/candidates')}
              >
                View all
              </Button>
            </CardHeader>
            <div className="p-6 pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {mockRecentCandidates.map((candidate) => (
                    <div 
                      key={candidate.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-brand-grey-100/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/candidates/${candidate.id}`)}
                    >
                      <Avatar 
                        name={`${candidate.first_name} ${candidate.last_name}`} 
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-slate-900">
                          {candidate.first_name} {candidate.last_name}
                        </p>
                        <p className="text-sm text-brand-grey-400 truncate">
                          {candidate.current_role}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusVariant(candidate.status || '')}>
                          {statusLabels[candidate.status as keyof typeof statusLabels] || candidate.status}
                        </Badge>
                        <p className="text-xs text-brand-grey-400 mt-1">
                          {formatRelativeTime(candidate.created_at || '')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Upcoming Interviews */}
          <Card padding="none">
            <CardHeader className="p-6 pb-0">
              <CardTitle>Upcoming Interviews</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/interviews')}
              >
                View all
              </Button>
            </CardHeader>
            <div className="p-6 pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {mockUpcomingInterviews.map((interview) => (
                    <div 
                      key={interview.id}
                      className="p-3 rounded-lg border border-brand-grey-200/50 hover:border-brand-grey-200 cursor-pointer transition-colors"
                      onClick={() => navigate(`/interviews/${interview.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-brand-slate-900">
                          {interview.candidate_name}
                        </p>
                        <Badge variant={getStatusVariant(interview.stage || '')} size="sm">
                          {statusLabels[interview.stage as keyof typeof statusLabels] || interview.stage}
                        </Badge>
                      </div>
                      <p className="text-sm text-brand-grey-400 mt-1">
                        {interview.requirement_title}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-brand-cyan">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(interview.scheduled_at || '').toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <span className="text-sm text-brand-grey-400 capitalize">
              Logged in as: <span className="font-medium text-brand-slate-700">{user?.role}</span>
            </span>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            {canAddCandidates && (
              <Button onClick={() => navigate('/candidates/new')}>
                Add New Candidate
              </Button>
            )}
            {canCreateRequirements && (
              <Button variant="secondary" onClick={() => navigate('/requirements/new')}>
                Create Requirement
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/search')}>
              Search Database
            </Button>
            {canApproveContracts && (
              <Button variant="secondary" onClick={() => navigate('/contracts')}>
                Review Contracts
              </Button>
            )}
            {canManageOrganisation && (
              <Button variant="secondary" onClick={() => navigate('/organisation')}>
                Manage Organisation
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  change: string;
  changeType: 'positive' | 'warning' | 'negative' | 'neutral';
  isLoading?: boolean;
}

function StatCard({ icon, label, value, change, changeType, isLoading }: StatCardProps) {
  const changeColours = {
    positive: 'text-green-600',
    warning: 'text-amber-600',
    negative: 'text-red-600',
    neutral: 'text-brand-grey-400',
  };

  const iconBg = {
    positive: 'bg-green-100 text-green-600',
    warning: 'bg-amber-100 text-amber-600',
    negative: 'bg-red-100 text-red-600',
    neutral: 'bg-brand-grey-100 text-brand-grey-400',
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-4 w-24 mt-3" />
        <Skeleton className="h-3 w-20 mt-2" />
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${iconBg[changeType]}`}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-brand-slate-900">
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-brand-slate-700">{label}</p>
      <p className={`mt-1 text-xs ${changeColours[changeType]}`}>{change}</p>
    </Card>
  );
}
