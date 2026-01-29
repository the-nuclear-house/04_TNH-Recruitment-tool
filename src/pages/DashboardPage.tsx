import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardHeader, CardTitle, Button, Badge, Avatar } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/auth-store';
import { candidatesService, requirementsService, interviewsService } from '@/lib/services';
import { formatDate } from '@/lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalRequirements: 0,
    activeRequirements: 0,
    upcomingInterviews: 0,
  });
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [recentRequirements, setRecentRequirements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [candidates, requirements, interviews] = await Promise.all([
        candidatesService.getAll(),
        requirementsService.getAll(),
        interviewsService.getAll(),
      ]);

      setStats({
        totalCandidates: candidates.length,
        totalRequirements: requirements.length,
        activeRequirements: requirements.filter(r => r.status === 'active' || r.status === 'opportunity').length,
        upcomingInterviews: interviews.filter(i => i.outcome === 'pending').length,
      });

      setRecentCandidates(candidates.slice(0, 5));
      setRecentRequirements(requirements.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'}`}
        subtitle="Here's what's happening in your recruitment pipeline"
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/candidates')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-cyan/10 rounded-xl">
                <Users className="h-6 w-6 text-brand-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.totalCandidates}</p>
                <p className="text-sm text-brand-grey-400">Total Candidates</p>
              </div>
            </div>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/requirements')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-green/10 rounded-xl">
                <Briefcase className="h-6 w-6 text-brand-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.activeRequirements}</p>
                <p className="text-sm text-brand-grey-400">Active Requirements</p>
              </div>
            </div>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/interviews')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.upcomingInterviews}</p>
                <p className="text-sm text-brand-grey-400">Pending Interviews</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-slate-900">{stats.totalRequirements}</p>
                <p className="text-sm text-brand-grey-400">Total Requirements</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800">Add New Candidate</h3>
                <p className="text-sm text-green-600">Start building your talent pipeline</p>
              </div>
              <Button 
                variant="success" 
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/candidates')}
              >
                Add Candidate
              </Button>
            </div>
          </Card>

          <Card className="bg-cyan-50 border-cyan-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-cyan-800">Create Requirement</h3>
                <p className="text-sm text-cyan-600">Define a new customer need</p>
              </div>
              <Button 
                variant="accent" 
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/requirements')}
              >
                New Requirement
              </Button>
            </div>
          </Card>
        </div>

        {/* Recent Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Candidates */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Candidates</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/candidates')}
              >
                View All
              </Button>
            </CardHeader>
            
            {isLoading ? (
              <p className="text-brand-grey-400 text-sm">Loading...</p>
            ) : recentCandidates.length === 0 ? (
              <p className="text-brand-grey-400 text-sm">No candidates yet. Add your first candidate to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentCandidates.map(candidate => (
                  <div 
                    key={candidate.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-grey-100/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={`${candidate.first_name} ${candidate.last_name}`} size="sm" />
                      <div>
                        <p className="font-medium text-brand-slate-900">
                          {candidate.first_name} {candidate.last_name}
                        </p>
                        <p className="text-sm text-brand-grey-400">{candidate.email}</p>
                      </div>
                    </div>
                    <Badge variant="grey">{candidate.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Requirements</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/requirements')}
              >
                View All
              </Button>
            </CardHeader>
            
            {isLoading ? (
              <p className="text-brand-grey-400 text-sm">Loading...</p>
            ) : recentRequirements.length === 0 ? (
              <p className="text-brand-grey-400 text-sm">No requirements yet. Create your first requirement to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentRequirements.map(req => (
                  <div 
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-grey-100/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/requirements/${req.id}`)}
                  >
                    <div>
                      <p className="font-medium text-brand-slate-900">{req.customer}</p>
                      <p className="text-sm text-brand-grey-400">
                        {req.fte_count} FTE · {req.location || 'No location'}
                      </p>
                    </div>
                    <Badge variant={req.status === 'active' ? 'green' : req.status === 'opportunity' ? 'orange' : 'grey'}>
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
