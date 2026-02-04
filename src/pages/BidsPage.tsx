import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Building2,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Input, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/lib/stores/ui-store';
import { requirementsService, type DbRequirement } from '@/lib/services';

const bidStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  qualifying: { label: 'Qualifying', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  proposal: { label: 'Proposal', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  submitted: { label: 'Submitted', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  won: { label: 'Won', color: 'text-green-700', bgColor: 'bg-green-100' },
  lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export function BidsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [bids, setBids] = useState<DbRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    loadBids();
  }, []);

  const loadBids = async () => {
    try {
      setIsLoading(true);
      const data = await requirementsService.getAllBids();
      setBids(data);
    } catch (error) {
      console.error('Error loading bids:', error);
      toast.error('Error', 'Failed to load bids');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBids = useMemo(() => {
    return bids.filter(bid => {
      const matchesSearch = !searchQuery || 
        bid.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.reference_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && ['qualifying', 'proposal', 'submitted'].includes(bid.bid_status || '')) ||
        bid.bid_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [bids, searchQuery, statusFilter]);

  const stats = {
    total: bids.length,
    qualifying: bids.filter(b => b.bid_status === 'qualifying').length,
    proposal: bids.filter(b => b.bid_status === 'proposal').length,
    submitted: bids.filter(b => b.bid_status === 'submitted').length,
    won: bids.filter(b => b.bid_status === 'won').length,
    lost: bids.filter(b => b.bid_status === 'lost').length,
  };

  const getGoNoGoScore = (bid: DbRequirement): number | null => {
    const scores = [
      bid.meddpicc_metrics,
      bid.meddpicc_economic_buyer,
      bid.meddpicc_decision_criteria,
      bid.meddpicc_decision_process,
      bid.meddpicc_identify_pain,
      bid.meddpicc_paper_process,
      bid.meddpicc_champion,
      bid.meddpicc_competition,
    ].filter(s => s !== null) as number[];
    
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Bid Process" />
        <div className="p-6">
          <Card>
            <div className="text-center py-8 text-brand-grey-400">Loading bids...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Bid Process" 
        subtitle={`${stats.total} bids`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-brand-cyan' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div className="p-4">
              <p className="text-2xl font-bold text-brand-slate-900">{stats.total}</p>
              <p className="text-sm text-brand-grey-400">All Bids</p>
            </div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'qualifying' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setStatusFilter('qualifying')}
          >
            <div className="p-4">
              <p className="text-2xl font-bold text-purple-600">{stats.qualifying}</p>
              <p className="text-sm text-brand-grey-400">Qualifying</p>
            </div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'proposal' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter('proposal')}
          >
            <div className="p-4">
              <p className="text-2xl font-bold text-blue-600">{stats.proposal}</p>
              <p className="text-sm text-brand-grey-400">Proposal</p>
            </div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'submitted' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            <div className="p-4">
              <p className="text-2xl font-bold text-amber-600">{stats.submitted}</p>
              <p className="text-sm text-brand-grey-400">Submitted</p>
            </div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'won' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter('won')}
          >
            <div className="p-4">
              <p className="text-2xl font-bold text-green-600">{stats.won}</p>
              <p className="text-sm text-brand-grey-400">Won</p>
            </div>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'lost' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setStatusFilter('lost')}
          >
            <div className="p-4">
              <p className="text-2xl font-bold text-red-600">{stats.lost}</p>
              <p className="text-sm text-brand-grey-400">Lost</p>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <div className="p-4">
            <Input
              placeholder="Search by title, customer, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </Card>

        {/* Bids List */}
        {filteredBids.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No bids found"
            description={searchQuery ? "Try adjusting your search" : "No bids in this category yet"}
          />
        ) : (
          <div className="space-y-3">
            {filteredBids.map(bid => {
              const statusInfo = bidStatusConfig[bid.bid_status || 'qualifying'];
              const score = getGoNoGoScore(bid);
              
              return (
                <Card 
                  key={bid.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/bids/${bid.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-brand-grey-400 font-mono">{bid.reference_id}</span>
                          <h3 className="font-semibold text-brand-slate-900">{bid.title || 'Untitled Bid'}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-brand-grey-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {bid.company?.name || bid.customer}
                          </span>
                          {bid.contact && (
                            <span>→ {bid.contact.first_name} {bid.contact.last_name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(bid.created_at)}
                          </span>
                          {bid.proposal_value && (
                            <span className="flex items-center gap-1 font-medium text-brand-slate-700">
                              £{bid.proposal_value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* MEDDPICC Score */}
                        {score !== null && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              score >= 4 ? 'text-green-600' : 
                              score >= 3 ? 'text-amber-600' : 
                              'text-red-600'
                            }`}>
                              {score}/5
                            </div>
                            <p className="text-xs text-brand-grey-400">MEDDPICC</p>
                          </div>
                        )}
                        
                        {/* Go/No-Go indicator */}
                        {bid.go_nogo_decision && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                            bid.go_nogo_decision === 'go' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {bid.go_nogo_decision === 'go' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium uppercase">{bid.go_nogo_decision}</span>
                          </div>
                        )}
                        
                        <ArrowRight className="h-5 w-5 text-brand-grey-300" />
                      </div>
                    </div>
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
