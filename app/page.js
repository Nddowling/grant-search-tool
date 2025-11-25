'use client';

import { useState, useEffect } from 'react';

// Grant status options for tracking
const GRANT_STATUSES = [
  { value: 'interested', label: 'Interested', color: 'bg-blue-100 text-blue-800', icon: '👀' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-purple-100 text-purple-800', icon: '📖' },
  { value: 'applied', label: 'Applied', color: 'bg-yellow-100 text-yellow-800', icon: '📝' },
  { value: 'pending', label: 'Pending', color: 'bg-orange-100 text-orange-800', icon: '⏳' },
  { value: 'awarded', label: 'Awarded', color: 'bg-green-100 text-green-800', icon: '🎉' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800', icon: '❌' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [agency, setAgency] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [samType, setSamType] = useState('g'); // Default to grants only
  const [results, setResults] = useState({ grants: [], sam: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, deadline, posted, amount
  const [editingNote, setEditingNote] = useState(null); // ID of grant being edited
  const [noteText, setNoteText] = useState('');
  const [selectedForBulk, setSelectedForBulk] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all'); // Filter favorites by status

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('grantSearchFavorites');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('grantSearchFavorites', JSON.stringify(favorites));
    } catch (e) {
      console.error('Error saving favorites:', e);
    }
  }, [favorites]);

  // Calculate relevance score based on keyword matches
  const calculateRelevanceScore = (opp, query) => {
    if (!query) return 0;

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    let score = 0;

    const title = (opp.title || opp.opportunityTitle || '').toLowerCase();
    const description = (opp.description || opp.synopsis?.synopsisDesc || '').toLowerCase();
    const agency = (opp.agency || opp.agencyName || opp.department || '').toLowerCase();

    searchTerms.forEach(term => {
      // Title matches are worth more (10 points each)
      if (title.includes(term)) {
        score += 10;
        // Exact word match in title is even better
        if (title.split(/\s+/).includes(term)) score += 5;
      }

      // Agency matches (5 points)
      if (agency.includes(term)) score += 5;

      // Description matches (2 points each)
      if (description.includes(term)) {
        score += 2;
        // Count multiple occurrences (up to 3)
        const matches = (description.match(new RegExp(term, 'g')) || []).length;
        score += Math.min(matches - 1, 2);
      }
    });

    // Boost for having award amount specified
    if (opp.awardCeiling || opp.award?.amount) score += 2;

    // Boost for having deadline in the future
    const deadline = opp.closeDate || opp.responseDeadLine;
    if (deadline && new Date(deadline) > new Date()) score += 3;

    return score;
  };

  const searchGrants = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [grantsRes, samRes] = await Promise.allSettled([
        fetch(`/api/grants?keyword=${encodeURIComponent(searchQuery)}&agency=${encodeURIComponent(agency)}&eligibility=${encodeURIComponent(eligibility)}`),
        fetch(`/api/sam?keyword=${encodeURIComponent(searchQuery)}&agency=${encodeURIComponent(agency)}&type=${encodeURIComponent(samType)}`)
      ]);

      const grantsData = grantsRes.status === 'fulfilled' && grantsRes.value.ok
        ? await grantsRes.value.json()
        : { opportunities: [], error: 'Grants.gov search failed' };

      const samData = samRes.status === 'fulfilled' && samRes.value.ok
        ? await samRes.value.json()
        : { opportunities: [], error: 'SAM.gov search failed' };

      // Add relevance scores
      const grantsWithScores = (grantsData.opportunities || []).map(g => ({
        ...g,
        relevanceScore: calculateRelevanceScore(g, searchQuery)
      }));

      const samWithScores = (samData.opportunities || []).map(s => ({
        ...s,
        relevanceScore: calculateRelevanceScore(s, searchQuery)
      }));

      setResults({
        grants: grantsWithScores,
        sam: samWithScores,
        grantsError: grantsData.error,
        samError: samData.error
      });

    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (opportunity, source) => {
    const id = `${source}-${opportunity.id || opportunity.noticeId}`;
    let newFavorites;

    if (favorites.some(f => f.id === id)) {
      newFavorites = favorites.filter(f => f.id !== id);
    } else {
      newFavorites = [...favorites, {
        ...opportunity,
        id,
        source,
        savedAt: new Date().toISOString(),
        status: 'interested', // Default status
        note: '' // Empty note by default
      }];
    }

    setFavorites(newFavorites);
  };

  const isFavorite = (opportunity, source) => {
    const id = `${source}-${opportunity.id || opportunity.noticeId}`;
    return favorites.some(f => f.id === id);
  };

  // Update the status of a saved grant
  const updateGrantStatus = (grantId, newStatus) => {
    setFavorites(favorites.map(f =>
      f.id === grantId ? { ...f, status: newStatus } : f
    ));
  };

  // Update notes for a saved grant
  const updateGrantNote = (grantId, note) => {
    setFavorites(favorites.map(f =>
      f.id === grantId ? { ...f, note } : f
    ));
    setEditingNote(null);
    setNoteText('');
  };

  // Start editing a note
  const startEditingNote = (grant) => {
    setEditingNote(grant.id);
    setNoteText(grant.note || '');
  };

  // Calculate deadline urgency
  const getDeadlineUrgency = (dateStr) => {
    if (!dateStr) return { level: 'unknown', label: 'No deadline', color: 'text-gray-500' };
    const deadline = new Date(dateStr);
    const now = new Date();
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { level: 'passed', label: 'Passed', color: 'text-gray-400', bg: 'bg-gray-100' };
    if (daysUntil <= 7) return { level: 'urgent', label: `${daysUntil}d left`, color: 'text-red-600', bg: 'bg-red-50' };
    if (daysUntil <= 30) return { level: 'soon', label: `${daysUntil}d left`, color: 'text-orange-600', bg: 'bg-orange-50' };
    return { level: 'safe', label: `${daysUntil}d left`, color: 'text-green-600', bg: 'bg-green-50' };
  };

  // Toggle selection for bulk actions
  const toggleBulkSelection = (grantId) => {
    const newSelected = new Set(selectedForBulk);
    if (newSelected.has(grantId)) {
      newSelected.delete(grantId);
    } else {
      newSelected.add(grantId);
    }
    setSelectedForBulk(newSelected);
  };

  // Select/deselect all favorites
  const toggleSelectAll = () => {
    if (selectedForBulk.size === favorites.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(favorites.map(f => f.id)));
    }
  };

  // Bulk delete selected
  const bulkDeleteSelected = () => {
    if (selectedForBulk.size === 0) return;
    if (confirm(`Remove ${selectedForBulk.size} grant(s) from your saved list?`)) {
      setFavorites(favorites.filter(f => !selectedForBulk.has(f.id)));
      setSelectedForBulk(new Set());
    }
  };

  // Export favorites to CSV
  const exportToCSV = () => {
    if (favorites.length === 0) return;

    const headers = ['Title', 'Source', 'Agency', 'Award Amount', 'Deadline', 'Posted Date', 'Status', 'Notes', 'Saved Date', 'Link'];
    const rows = favorites.map(f => [
      (f.title || f.opportunityTitle || '').replace(/,/g, ';'),
      f.source === 'grants' ? 'Grants.gov' : 'SAM.gov',
      (f.agency || f.agencyName || f.department || '').replace(/,/g, ';'),
      f.awardCeiling || f.award?.amount || '',
      f.closeDate || f.responseDeadLine || '',
      f.postDate || f.postedDate || '',
      GRANT_STATUSES.find(s => s.value === f.status)?.label || 'Interested',
      (f.note || '').replace(/,/g, ';').replace(/\n/g, ' '),
      f.savedAt ? new Date(f.savedAt).toLocaleDateString() : '',
      f.source === 'grants'
        ? `https://www.grants.gov/search-results-detail/${f.id?.replace('grants-', '')}`
        : `https://sam.gov/opp/${f.noticeId}/view`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grant-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get status info for a grant
  const getGrantStatus = (grant) => {
    return GRANT_STATUSES.find(s => s.value === grant.status) || GRANT_STATUSES[0];
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Sort function based on selected criteria
  const sortResults = (results) => {
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case 'deadline':
          const deadlineA = new Date(a.closeDate || a.responseDeadLine || '9999-12-31');
          const deadlineB = new Date(b.closeDate || b.responseDeadLine || '9999-12-31');
          return deadlineA - deadlineB;
        case 'posted':
          const postedA = new Date(a.postDate || a.postedDate || '1970-01-01');
          const postedB = new Date(b.postDate || b.postedDate || '1970-01-01');
          return postedB - postedA; // Most recent first
        case 'amount':
          const amountA = a.awardCeiling || a.award?.amount || 0;
          const amountB = b.awardCeiling || b.award?.amount || 0;
          return amountB - amountA; // Highest first
        default:
          return 0;
      }
    });
  };

  const allResults = [
    ...results.grants.map(g => ({ ...g, source: 'grants' })),
    ...results.sam.map(s => ({ ...s, source: 'sam' }))
  ];

  const getFilteredResults = () => {
    let filtered;
    if (activeTab === 'all') {
      filtered = allResults;
    } else if (activeTab === 'grants') {
      filtered = results.grants.map(g => ({ ...g, source: 'grants' }));
    } else if (activeTab === 'sam') {
      filtered = results.sam.map(s => ({ ...s, source: 'sam' }));
    } else {
      // Favorites tab - apply status filter
      filtered = filterStatus === 'all'
        ? favorites
        : favorites.filter(f => f.status === filterStatus);
    }
    return sortResults(filtered);
  };

  // Calculate stats for favorites
  const getFavoritesStats = () => {
    const stats = {
      total: favorites.length,
      byStatus: {},
      urgentDeadlines: 0,
      soonDeadlines: 0
    };

    GRANT_STATUSES.forEach(s => stats.byStatus[s.value] = 0);

    favorites.forEach(f => {
      const status = f.status || 'interested';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      const deadline = f.closeDate || f.responseDeadLine;
      if (deadline) {
        const urgency = getDeadlineUrgency(deadline);
        if (urgency.level === 'urgent') stats.urgentDeadlines++;
        if (urgency.level === 'soon') stats.soonDeadlines++;
      }
    });

    return stats;
  };

  const favoritesStats = getFavoritesStats();

  const filteredResults = getFilteredResults();

  // Get SAM type label for display
  const getSamTypeLabel = (type) => {
    const labels = {
      'g': 'Grants',
      'o': 'Contracts',
      'p': 'Presolicitations',
      'k': 'Combined Synopsis',
      'r': 'Sources Sought',
      's': 'Special Notices',
      '': 'All Types'
    };
    return labels[type] || type;
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Federal Grant Search
          </h1>
          <p className="text-xl text-blue-200">
            Search Grants.gov & SAM.gov in one place
          </p>
        </div>

        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-white/80 text-sm mb-2">Search Keywords</label>
              <input
                type="text"
                placeholder="e.g., healthcare, infrastructure, education..."
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchGrants()}
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Agency (Optional)</label>
              <input
                type="text"
                placeholder="e.g., HHS, DOT, EPA..."
                className="input-field"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Eligibility</label>
              <select
                className="input-field"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
              >
                <option value="">All Eligible</option>
                <option value="00">State governments</option>
                <option value="01">County governments</option>
                <option value="02">City or township governments</option>
                <option value="04">Special district governments</option>
                <option value="05">Independent school districts</option>
                <option value="06">Public institutions of higher education</option>
                <option value="07">Native American tribal governments</option>
                <option value="11">Native American tribal organizations</option>
                <option value="12">Nonprofits (501c3)</option>
                <option value="13">Nonprofits (non-501c3)</option>
                <option value="20">Private institutions of higher education</option>
                <option value="21">Individuals</option>
                <option value="22">For-profit organizations</option>
                <option value="23">Small businesses</option>
                <option value="25">Others</option>
              </select>
            </div>
          </div>

          {/* New row for SAM.gov type filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">SAM.gov Type</label>
              <select
                className="input-field"
                value={samType}
                onChange={(e) => setSamType(e.target.value)}
              >
                <option value="g">Grants Only</option>
                <option value="o">Contracts Only</option>
                <option value="p">Presolicitations</option>
                <option value="k">Combined Synopsis</option>
                <option value="r">Sources Sought</option>
                <option value="s">Special Notices</option>
                <option value="">All Types</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Sort Results By</label>
              <select
                className="input-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="relevance">Relevance</option>
                <option value="deadline">Deadline (Soonest)</option>
                <option value="posted">Posted Date (Newest)</option>
                <option value="amount">Award Amount (Highest)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end gap-4">
              <button
                onClick={searchGrants}
                disabled={loading}
                className="btn-primary flex items-center gap-2 flex-1"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    Search Grants
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setAgency('');
                  setEligibility('');
                  setSamType('g');
                  setSortBy('relevance');
                  setResults({ grants: [], sam: [] });
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {(results.grants.length > 0 || results.sam.length > 0 || favorites.length > 0) && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-blue-900'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All Results ({allResults.length})
            </button>
            <button
              onClick={() => setActiveTab('grants')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'grants'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Grants.gov ({results.grants.length})
            </button>
            <button
              onClick={() => setActiveTab('sam')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'sam'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              SAM.gov ({results.sam.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'favorites'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              My Grants ({favorites.length})
              {favoritesStats.urgentDeadlines > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {favoritesStats.urgentDeadlines}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Manager Controls - shown when on favorites tab */}
        {activeTab === 'favorites' && favorites.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-white/80 text-sm">Filter by status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input-field !w-auto !py-1.5 text-sm"
                >
                  <option value="all">All ({favorites.length})</option>
                  {GRANT_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.icon} {s.label} ({favoritesStats.byStatus[s.value] || 0})
                    </option>
                  ))}
                </select>

                {favoritesStats.urgentDeadlines > 0 && (
                  <span className="text-red-300 text-sm">
                    {favoritesStats.urgentDeadlines} urgent deadline{favoritesStats.urgentDeadlines > 1 ? 's' : ''}
                  </span>
                )}
                {favoritesStats.soonDeadlines > 0 && (
                  <span className="text-orange-300 text-sm">
                    {favoritesStats.soonDeadlines} due soon
                  </span>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-white/70 hover:text-white underline"
                >
                  {selectedForBulk.size === favorites.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedForBulk.size > 0 && (
                  <button
                    onClick={bulkDeleteSelected}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1.5 rounded text-sm transition-colors"
                  >
                    Remove ({selectedForBulk.size})
                  </button>
                )}
                <button
                  onClick={exportToCSV}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {filteredResults.map((opp, idx) => {
            const isInFavorites = activeTab === 'favorites';
            const deadlineDate = opp.closeDate || opp.responseDeadLine || opp.archiveDate;
            const deadlineUrgency = getDeadlineUrgency(deadlineDate);
            const currentStatus = getGrantStatus(opp);

            return (
            <div
              key={`${opp.source}-${opp.id || opp.noticeId || idx}`}
              className={`grant-card ${opp.source === 'grants' ? 'grants-gov' : 'sam-gov'} ${
                isInFavorites && selectedForBulk.has(opp.id) ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                {/* Checkbox for bulk selection in favorites */}
                {isInFavorites && (
                  <input
                    type="checkbox"
                    checked={selectedForBulk.has(opp.id)}
                    onChange={() => toggleBulkSelection(opp.id)}
                    className="mt-1 mr-3 w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                  />
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      opp.source === 'grants' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {opp.source === 'grants' ? 'GRANTS.GOV' : 'SAM.GOV'}
                    </span>
                    {opp.source === 'sam' && opp.type && (
                      <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                        {opp.type}
                      </span>
                    )}
                    {/* Status badge for favorites */}
                    {isInFavorites && (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${currentStatus.color}`}>
                        {currentStatus.icon} {currentStatus.label}
                      </span>
                    )}
                    {/* Deadline urgency badge */}
                    {deadlineUrgency.level !== 'unknown' && (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${deadlineUrgency.bg} ${deadlineUrgency.color}`}>
                        {deadlineUrgency.label}
                      </span>
                    )}
                    {sortBy === 'relevance' && opp.relevanceScore > 0 && !isInFavorites && (
                      <span className="inline-block px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">
                        Score: {opp.relevanceScore}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {opp.title || opp.opportunityTitle || 'Untitled Opportunity'}
                  </h3>
                </div>
                <button
                  onClick={() => toggleFavorite(opp, opp.source)}
                  className="text-2xl hover:scale-110 transition-transform ml-2"
                  title={isFavorite(opp, opp.source) ? 'Remove from My Grants' : 'Add to My Grants'}
                >
                  {isFavorite(opp, opp.source) ? '★' : '☆'}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Agency</span>
                  <span className="font-medium text-gray-900">
                    {opp.agency || opp.agencyName || opp.department || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Award</span>
                  <span className="font-medium text-gray-900">
                    {opp.awardCeiling ? formatCurrency(opp.awardCeiling) :
                     opp.award?.amount ? formatCurrency(opp.award.amount) : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Deadline</span>
                  <span className={`font-medium ${deadlineUrgency.color}`}>
                    {formatDate(deadlineDate)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Posted</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(opp.postDate || opp.postedDate)}
                  </span>
                </div>
              </div>

              {(opp.description || opp.synopsis?.synopsisDesc) && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {opp.description || opp.synopsis?.synopsisDesc}
                </p>
              )}

              {/* Manager controls for favorites */}
              {isInFavorites && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                  {/* Status selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm">Status:</span>
                    <select
                      value={opp.status || 'interested'}
                      onChange={(e) => updateGrantStatus(opp.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {GRANT_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                      ))}
                    </select>
                    <span className="text-gray-400 text-xs ml-auto">
                      Saved {opp.savedAt ? new Date(opp.savedAt).toLocaleDateString() : 'recently'}
                    </span>
                  </div>

                  {/* Notes section */}
                  <div>
                    {editingNote === opp.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add your notes about this grant..."
                          className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateGrantNote(opp.id, noteText)}
                            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Save Note
                          </button>
                          <button
                            onClick={() => { setEditingNote(null); setNoteText(''); }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {opp.note ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{opp.note}</p>
                            <button
                              onClick={() => startEditingNote(opp)}
                              className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                            >
                              Edit note
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingNote(opp)}
                            className="text-sm text-gray-400 hover:text-gray-600"
                          >
                            + Add notes
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`flex gap-3 ${isInFavorites ? 'mt-3' : ''}`}>
                {opp.source === 'grants' && (opp.id || opp.opportunityId) && (
                  <a
                    href={`https://www.grants.gov/search-results-detail/${(opp.id || '').replace('grants-', '') || opp.opportunityId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    View on Grants.gov →
                  </a>
                )}
                {opp.source === 'sam' && opp.noticeId && (
                  <a
                    href={`https://sam.gov/opp/${opp.noticeId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                  >
                    View on SAM.gov →
                  </a>
                )}
              </div>
            </div>
          );
          })}

          {filteredResults.length === 0 && !loading && (
            <div className="text-center py-12">
              {activeTab === 'favorites' ? (
                favorites.length === 0 ? (
                  <div className="card p-8 max-w-md mx-auto">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-white mb-2">Start Building Your Grant Portfolio</h3>
                    <p className="text-white/70 mb-4">
                      Click the ☆ star on any grant to save it here. Track your application progress, add notes, and never miss a deadline.
                    </p>
                    <div className="text-sm text-white/50">
                      Search for grants above to get started
                    </div>
                  </div>
                ) : (
                  <div className="text-white/70">
                    No grants match the selected filter. <button onClick={() => setFilterStatus('all')} className="underline hover:text-white">Show all</button>
                  </div>
                )
              ) : (
                <div className="text-white/70">No results found. Try different search terms.</div>
              )}
            </div>
          )}
        </div>

        {(results.grantsError || results.samError) && (
          <div className="mt-4 text-sm text-yellow-200">
            {results.grantsError && <p>Grants.gov: {results.grantsError}</p>}
            {results.samError && <p>SAM.gov: {results.samError}</p>}
          </div>
        )}
      </div>

      <footer className="text-center text-white/50 text-sm py-8">
        <p>Data sourced from Grants.gov and SAM.gov APIs</p>
        <p className="mt-2">Built for FedGrantLink by Nick @ Canopy</p>
      </footer>
    </main>
  );
}
