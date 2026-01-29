import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Building2, 
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  Badge, 
  Avatar, 
  EmptyState,
  Modal,
  Button,
  Textarea,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToast } from '@/lib/stores/ui-store';
import { customerAssessmentsService, type DbCustomerAssessment } from '@/lib/services';

const outcomeConfig = {
  pending: { label: 'Pending', colour: 'orange', icon: Clock },
  go: { label: 'GO', colour: 'green', icon: CheckCircle },
  nogo: { label: 'NO GO', colour: 'red', icon: XCircle },
};

export function CustomerAssessmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  
  const [assessments, setAssessments] = useState<DbCustomerAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'go' | 'nogo'>('all');
  
  // Outcome modal
  const [selectedAssessment, setSelectedAssessment] = useState<DbCustomerAssessment | null>(null);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await customerAssessmentsService.getAll();
      setAssessments(data);
    } catch (error) {
      console.error('Error loading assessments:', error);
      toast.error('Error', 'Failed to load customer assessments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetOutcome = async (outcome: 'go' | 'nogo') => {
    if (!selectedAssessment) return;
    
    setIsSubmitting(true);
    try {
      await customerAssessmentsService.updateOutcome(
        selectedAssessment.id, 
        outcome, 
        outcomeNotes || undefined
      );
      
      toast.success(
        outcome === 'go' ? 'Marked as GO!' : 'Marked as NO GO',
        'Customer assessment outcome has been recorded'
      );
      
      setIsOutcomeModalOpen(false);
      setSelectedAssessment(null);
      setOutcomeNotes('');
      loadData();
    } catch (error) {
      console.error('Error updating outcome:', error);
      toast.error('Error', 'Failed to update outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssessments = filter === 'all' 
    ? assessments 
    : assessments.filter(a => a.outcome === filter || (filter === 'pending' && !a.outcome));

  const stats = {
    total: assessments.length,
    pending: assessments.filter(a => !a.outcome || a.outcome === 'pending').length,
    go: assessments.filter(a => a.outcome === 'go').length,
    nogo: assessments.filter(a => a.outcome === 'nogo').length,
  };

  return (
    <div className="min-h-screen bg-brand-grey-100">
      <Header
        title="Customer Assessments"
        subtitle={`${stats.total} assessments · ${stats.pending} pending`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-brand-cyan' : ''}`}
            onClick={() => setFilter('all')}
          >
            <div className="text-2xl font-bold text-brand-slate-900">{stats.total}</div>
            <div className="text-sm text-brand-grey-400">All</div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-brand-orange' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <div className="text-2xl font-bold text-brand-orange">{stats.pending}</div>
            <div className="text-sm text-brand-grey-400">Pending</div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'go' ? 'ring-2 ring-brand-green' : ''}`}
            onClick={() => setFilter('go')}
          >
            <div className="text-2xl font-bold text-brand-green">{stats.go}</div>
            <div className="text-sm text-brand-grey-400">GO</div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${filter === 'nogo' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setFilter('nogo')}
          >
            <div className="text-2xl font-bold text-red-500">{stats.nogo}</div>
            <div className="text-sm text-brand-grey-400">NO GO</div>
          </Card>
        </div>

        {/* Assessments List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading assessments...</div>
          </Card>
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No customer assessments"
            description={filter === 'all' 
              ? "Customer assessments will appear here when candidates are scheduled to meet customers"
              : `No ${filter === 'pending' ? 'pending' : filter.toUpperCase()} assessments`
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => {
              const outcome = assessment.outcome || 'pending';
              const config = outcomeConfig[outcome as keyof typeof outcomeConfig];
              const Icon = config.icon;
              const candidate = assessment.application?.candidate;
              const requirement = assessment.application?.requirement;
              
              return (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar 
                        name={candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown'}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 
                            className="font-semibold text-brand-slate-900 cursor-pointer hover:text-brand-cyan"
                            onClick={() => candidate && navigate(`/candidates/${candidate.id}`)}
                          >
                            {candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown Candidate'}
                          </h3>
                          <div className="flex items-center gap-1">
                            <Icon className="h-3.5 w-3.5" style={{ color: config.colour === 'green' ? '#22c55e' : config.colour === 'red' ? '#ef4444' : '#f97316' }} />
                            <Badge variant={config.colour as any}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-brand-grey-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {requirement?.customer || 'Unknown Requirement'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(assessment.scheduled_date)}
                            {assessment.scheduled_time && ` at ${assessment.scheduled_time}`}
                          </span>
                          {assessment.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {assessment.location}
                            </span>
                          )}
                        </div>
                        
                        {assessment.notes && (
                          <p className="text-sm text-brand-grey-500 mt-2">{assessment.notes}</p>
                        )}
                        
                        {assessment.outcome_notes && (
                          <p className="text-sm text-brand-slate-700 mt-2 p-2 bg-brand-grey-50 rounded">
                            <strong>Outcome Notes:</strong> {assessment.outcome_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {(!assessment.outcome || assessment.outcome === 'pending') && (
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          leftIcon={<CheckCircle className="h-4 w-4" />}
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setIsOutcomeModalOpen(true);
                          }}
                        >
                          Record Outcome
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      <Modal
        isOpen={isOutcomeModalOpen}
        onClose={() => {
          setIsOutcomeModalOpen(false);
          setSelectedAssessment(null);
          setOutcomeNotes('');
        }}
        title="Record Assessment Outcome"
        description={selectedAssessment?.application?.candidate 
          ? `How did ${selectedAssessment.application.candidate.first_name}'s customer meeting go?`
          : 'Record the outcome of this customer assessment'
        }
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Outcome Notes (optional)"
            placeholder="Any feedback from the customer..."
            value={outcomeNotes}
            onChange={(e) => setOutcomeNotes(e.target.value)}
            rows={3}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="danger"
              className="flex-1"
              leftIcon={<XCircle className="h-5 w-5" />}
              onClick={() => handleSetOutcome('nogo')}
              isLoading={isSubmitting}
            >
              NO GO
            </Button>
            <Button
              variant="success"
              className="flex-1"
              leftIcon={<CheckCircle className="h-5 w-5" />}
              onClick={() => handleSetOutcome('go')}
              isLoading={isSubmitting}
            >
              GO
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
