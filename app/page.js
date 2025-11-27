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

// Data source configuration
const DATA_SOURCES = {
  grants: { name: 'Grants.gov', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800', category: 'opportunities' },
  sam: { name: 'SAM.gov', color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800', category: 'opportunities' },
  usaspending: { name: 'USASpending', color: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-800', category: 'awards' },
  nihReporter: { name: 'NIH RePORTER', color: 'bg-red-500', badge: 'bg-red-100 text-red-800', category: 'research' },
  nsf: { name: 'NSF Awards', color: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800', category: 'research' },
  federalReporter: { name: 'Federal RePORTER', color: 'bg-pink-500', badge: 'bg-pink-100 text-pink-800', category: 'research' },
  propublica: { name: 'ProPublica 990s', color: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-800', category: 'nonprofits' },
  fema: { name: 'FEMA Grants', color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800', category: 'disaster' },
  regulations: { name: 'Regulations.gov', color: 'bg-violet-500', badge: 'bg-violet-100 text-violet-800', category: 'regulatory' },
  california: { name: 'California Grants', color: 'bg-teal-500', badge: 'bg-teal-100 text-teal-800', category: 'state' },
};

// Category groups for filtering
const CATEGORIES = {
  opportunities: { label: 'Federal Opportunities', sources: ['grants', 'sam'] },
  awards: { label: 'Award History', sources: ['usaspending'] },
  research: { label: 'Research Grants', sources: ['nihReporter', 'nsf', 'federalReporter'] },
  nonprofits: { label: 'Nonprofit Data', sources: ['propublica'] },
  disaster: { label: 'Disaster Grants', sources: ['fema'] },
  regulatory: { label: 'Regulations', sources: ['regulations'] },
  state: { label: 'State Grants', sources: ['california'] },
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [agency, setAgency] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [samType, setSamType] = useState('g');
  const [results, setResults] = useState({
    grants: [], sam: [], usaspending: [], nihReporter: [],
    nsf: [], federalReporter: [], propublica: [], fema: [],
    regulations: [], california: []
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [pagination, setPagination] = useState({
    grants: { page: 1, totalPages: 0, total: 0 },
    sam: { page: 1, totalPages: 0, total: 0 },
    usaspending: { page: 1, totalPages: 0, total: 0 },
    nihReporter: { page: 1, totalPages: 0, total: 0 },
    nsf: { page: 1, totalPages: 0, total: 0 },
    federalReporter: { page: 1, totalPages: 0, total: 0 },
    propublica: { page: 1, totalPages: 0, total: 0 },
    fema: { page: 1, totalPages: 0, total: 0 },
    regulations: { page: 1, totalPages: 0, total: 0 },
    california: { page: 1, totalPages: 0, total: 0 },
  });
  const [favorites, setFavorites] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [selectedForBulk, setSelectedForBulk] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [enabledSources, setEnabledSources] = useState({
    grants: true, sam: true, usaspending: true, nihReporter: true,
    nsf: true, federalReporter: true, propublica: true, fema: true,
    regulations: true, california: true
  });

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

    const title = (opp.title || opp.opportunityTitle || opp.projectTitle || opp.name || '').toLowerCase();
    const description = (opp.description || opp.synopsis?.synopsisDesc || opp.abstract || opp.abstractText || '').toLowerCase();
    const agency = (opp.agency || opp.agencyName || opp.department || opp.grantmakerName || opp.organization || '').toLowerCase();

    searchTerms.forEach(term => {
      if (title.includes(term)) {
        score += 10;
        if (title.split(/\s+/).includes(term)) score += 5;
      }
      if (agency.includes(term)) score += 5;
      if (description.includes(term)) {
        score += 2;
        const matches = (description.match(new RegExp(term, 'g')) || []).length;
        score += Math.min(matches - 1, 2);
      }
    });

    // Boost for having amount specified
    if (opp.awardCeiling || opp.award?.amount || opp.amount || opp.awardAmount || opp.estimatedAmount || opp.totalCost) score += 2;

    // Boost for having deadline in the future
    const deadline = opp.closeDate || opp.responseDeadLine || opp.endDate || opp.commentEndDate;
    if (deadline && new Date(deadline) > new Date()) score += 3;

    return score;
  };

  // Normalize results from different sources into a common format
  const normalizeResult = (item, source) => {
    const base = { ...item, source, relevanceScore: calculateRelevanceScore(item, searchQuery) };

    switch (source) {
      case 'grants':
        return {
          ...base,
          normalizedId: item.id || item.opportunityId,
          normalizedTitle: item.title || item.opportunityTitle,
          normalizedAgency: item.agency || item.agencyName,
          normalizedAmount: item.awardCeiling,
          normalizedDeadline: item.closeDate,
          normalizedPosted: item.postDate,
          normalizedDescription: item.description,
          normalizedLink: item.link || `https://www.grants.gov/search-results-detail/${item.id}`,
        };
      case 'sam':
        return {
          ...base,
          normalizedId: item.noticeId,
          normalizedTitle: item.title,
          normalizedAgency: item.department,
          normalizedAmount: item.award?.amount,
          normalizedDeadline: item.responseDeadLine,
          normalizedPosted: item.postedDate,
          normalizedDescription: item.description,
          normalizedLink: item.uiLink,
        };
      case 'usaspending':
        return {
          ...base,
          normalizedId: item.id || item.awardId,
          normalizedTitle: item.title || `Award to ${item.recipientName}`,
          normalizedAgency: item.agency,
          normalizedAmount: item.amount,
          normalizedDeadline: item.endDate,
          normalizedPosted: item.startDate,
          normalizedDescription: `Recipient: ${item.recipientName} (${item.recipientState})`,
          normalizedLink: item.link,
        };
      case 'nihReporter':
        return {
          ...base,
          normalizedId: item.id || item.projectNumber,
          normalizedTitle: item.title,
          normalizedAgency: `NIH - ${item.adminAgency || 'Various'}`,
          normalizedAmount: item.awardAmount,
          normalizedDeadline: item.endDate,
          normalizedPosted: item.startDate,
          normalizedDescription: item.abstract,
          normalizedLink: item.link,
          piName: item.piName,
          organization: item.organization,
        };
      case 'nsf':
        return {
          ...base,
          normalizedId: item.id,
          normalizedTitle: item.title,
          normalizedAgency: 'National Science Foundation',
          normalizedAmount: item.estimatedAmount || item.obligatedAmount,
          normalizedDeadline: item.endDate,
          normalizedPosted: item.startDate,
          normalizedDescription: item.abstract,
          normalizedLink: item.link,
          piName: item.piName,
          organization: item.institution,
        };
      case 'federalReporter':
        return {
          ...base,
          normalizedId: item.id || item.projectNumber,
          normalizedTitle: item.title,
          normalizedAgency: item.agency || item.agencyFullName,
          normalizedAmount: item.totalCost,
          normalizedDeadline: item.endDate,
          normalizedPosted: item.startDate,
          normalizedDescription: item.abstract,
          normalizedLink: item.link,
          piName: item.piName,
          organization: item.organization,
        };
      case 'propublica':
        return {
          ...base,
          normalizedId: item.ein,
          normalizedTitle: item.name,
          normalizedAgency: `${item.city}, ${item.state}`,
          normalizedAmount: item.totalRevenue,
          normalizedDeadline: null,
          normalizedPosted: null,
          normalizedDescription: `EIN: ${item.strEin} | Revenue: $${(item.totalRevenue || 0).toLocaleString()} | Assets: $${(item.totalAssets || 0).toLocaleString()}`,
          normalizedLink: item.link,
          isNonprofit: true,
        };
      case 'fema':
        return {
          ...base,
          normalizedId: item.id,
          normalizedTitle: item.projectTitle || item.declarationTitle,
          normalizedAgency: 'FEMA',
          normalizedAmount: item.federalShareObligated || item.projectAmount,
          normalizedDeadline: item.incidentEndDate,
          normalizedPosted: item.obligatedDate,
          normalizedDescription: `${item.applicantName} - ${item.incidentType} (${item.state})`,
          normalizedLink: item.link,
          disasterNumber: item.disasterNumber,
        };
      case 'regulations':
        return {
          ...base,
          normalizedId: item.id || item.documentId,
          normalizedTitle: item.title,
          normalizedAgency: item.agencyId,
          normalizedAmount: null,
          normalizedDeadline: item.commentEndDate,
          normalizedPosted: item.postedDate,
          normalizedDescription: item.summary || `Document Type: ${item.documentType}`,
          normalizedLink: item.link,
          documentType: item.documentType,
          openForComment: item.openForComment,
        };
      case 'california':
        return {
          ...base,
          normalizedId: item.id,
          normalizedTitle: item.title,
          normalizedAgency: item.grantmakerName,
          normalizedAmount: item.maxAward || item.estimatedAvailable,
          normalizedDeadline: item.closeDate,
          normalizedPosted: item.openDate,
          normalizedDescription: item.description,
          normalizedLink: item.link || item.applicationUrl,
        };
      default:
        return base;
    }
  };

  const searchGrants = async (pages = {}) => {
    if (!searchQuery.trim()) {
      setErrors({ general: 'Please enter a search term' });
      return;
    }

    setLoading(true);
    setErrors({});

    const currentPages = { ...pagination };
    Object.keys(pages).forEach(key => {
      if (pages[key]) currentPages[key] = { ...currentPages[key], page: pages[key] };
    });

    try {
      // Build fetch promises for all enabled sources
      const fetchPromises = [];
      const sourceKeys = [];

      if (enabledSources.grants) {
        sourceKeys.push('grants');
        fetchPromises.push(
          fetch(`/api/grants?keyword=${encodeURIComponent(searchQuery)}&agency=${encodeURIComponent(agency)}&eligibility=${encodeURIComponent(eligibility)}&page=${currentPages.grants.page}`)
        );
      }

      if (enabledSources.sam) {
        sourceKeys.push('sam');
        fetchPromises.push(
          fetch(`/api/sam?keyword=${encodeURIComponent(searchQuery)}&agency=${encodeURIComponent(agency)}&type=${encodeURIComponent(samType)}&page=${currentPages.sam.page}`)
        );
      }

      if (enabledSources.usaspending) {
        sourceKeys.push('usaspending');
        fetchPromises.push(
          fetch(`/api/usaspending?keyword=${encodeURIComponent(searchQuery)}&agency=${encodeURIComponent(agency)}&page=${currentPages.usaspending.page}`)
        );
      }

      if (enabledSources.nihReporter) {
        sourceKeys.push('nihReporter');
        fetchPromises.push(
          fetch(`/api/nih-reporter?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.nihReporter.page}`)
        );
      }

      if (enabledSources.nsf) {
        sourceKeys.push('nsf');
        fetchPromises.push(
          fetch(`/api/nsf?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.nsf.page}`)
        );
      }

      if (enabledSources.federalReporter) {
        sourceKeys.push('federalReporter');
        fetchPromises.push(
          fetch(`/api/federal-reporter?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.federalReporter.page}`)
        );
      }

      if (enabledSources.propublica) {
        sourceKeys.push('propublica');
        fetchPromises.push(
          fetch(`/api/propublica?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.propublica.page}`)
        );
      }

      if (enabledSources.fema) {
        sourceKeys.push('fema');
        fetchPromises.push(
          fetch(`/api/fema?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.fema.page}`)
        );
      }

      if (enabledSources.regulations) {
        sourceKeys.push('regulations');
        fetchPromises.push(
          fetch(`/api/regulations?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.regulations.page}`)
        );
      }

      if (enabledSources.california) {
        sourceKeys.push('california');
        fetchPromises.push(
          fetch(`/api/california?keyword=${encodeURIComponent(searchQuery)}&page=${currentPages.california.page}`)
        );
      }

      const responses = await Promise.allSettled(fetchPromises);

      const newResults = { ...results };
      const newErrors = {};
      const newPagination = { ...pagination };

      for (let i = 0; i < responses.length; i++) {
        const sourceKey = sourceKeys[i];
        const response = responses[i];

        if (response.status === 'fulfilled' && response.value.ok) {
          const data = await response.value.json();

          // Handle different response formats
          const items = data.opportunities || data.awards || data.projects ||
                       data.organizations || data.grants || data.documents || [];

          newResults[sourceKey] = items.map(item => normalizeResult(item, sourceKey));

          if (data.error) {
            newErrors[sourceKey] = data.error;
          }

          newPagination[sourceKey] = {
            page: data.page || 1,
            totalPages: data.totalPages || 0,
            total: data.total || items.length
          };
        } else {
          newResults[sourceKey] = [];
          newErrors[sourceKey] = `${DATA_SOURCES[sourceKey].name} search failed`;
          newPagination[sourceKey] = { page: 1, totalPages: 0, total: 0 };
        }
      }

      setResults(newResults);
      setErrors(newErrors);
      setPagination(newPagination);

    } catch (err) {
      setErrors({ general: 'Search failed. Please try again.' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changePage = async (source, newPage) => {
    await searchGrants({ [source]: newPage });
  };

  const toggleFavorite = (opportunity) => {
    const id = `${opportunity.source}-${opportunity.normalizedId}`;
    let newFavorites;

    if (favorites.some(f => f.id === id)) {
      newFavorites = favorites.filter(f => f.id !== id);
    } else {
      newFavorites = [...favorites, {
        ...opportunity,
        id,
        savedAt: new Date().toISOString(),
        status: 'interested',
        note: ''
      }];
    }

    setFavorites(newFavorites);
  };

  const isFavorite = (opportunity) => {
    const id = `${opportunity.source}-${opportunity.normalizedId}`;
    return favorites.some(f => f.id === id);
  };

  const updateGrantStatus = (grantId, newStatus) => {
    setFavorites(favorites.map(f =>
      f.id === grantId ? { ...f, status: newStatus } : f
    ));
  };

  const updateGrantNote = (grantId, note) => {
    setFavorites(favorites.map(f =>
      f.id === grantId ? { ...f, note } : f
    ));
    setEditingNote(null);
    setNoteText('');
  };

  const startEditingNote = (grant) => {
    setEditingNote(grant.id);
    setNoteText(grant.note || '');
  };

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

  const toggleBulkSelection = (grantId) => {
    const newSelected = new Set(selectedForBulk);
    if (newSelected.has(grantId)) {
      newSelected.delete(grantId);
    } else {
      newSelected.add(grantId);
    }
    setSelectedForBulk(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedForBulk.size === favorites.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(favorites.map(f => f.id)));
    }
  };

  const bulkDeleteSelected = () => {
    if (selectedForBulk.size === 0) return;
    if (confirm(`Remove ${selectedForBulk.size} grant(s) from your saved list?`)) {
      setFavorites(favorites.filter(f => !selectedForBulk.has(f.id)));
      setSelectedForBulk(new Set());
    }
  };

  const exportToCSV = () => {
    if (favorites.length === 0) return;

    const headers = ['Title', 'Source', 'Agency', 'Award Amount', 'Deadline', 'Posted Date', 'Status', 'Notes', 'Saved Date', 'Link'];
    const rows = favorites.map(f => [
      (f.normalizedTitle || '').replace(/,/g, ';'),
      DATA_SOURCES[f.source]?.name || f.source,
      (f.normalizedAgency || '').replace(/,/g, ';'),
      f.normalizedAmount || '',
      f.normalizedDeadline || '',
      f.normalizedPosted || '',
      GRANT_STATUSES.find(s => s.value === f.status)?.label || 'Interested',
      (f.note || '').replace(/,/g, ';').replace(/\n/g, ' '),
      f.savedAt ? new Date(f.savedAt).toLocaleDateString() : '',
      f.normalizedLink || ''
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

  const sortResults = (results) => {
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case 'deadline':
          const deadlineA = new Date(a.normalizedDeadline || '9999-12-31');
          const deadlineB = new Date(b.normalizedDeadline || '9999-12-31');
          return deadlineA - deadlineB;
        case 'posted':
          const postedA = new Date(a.normalizedPosted || '1970-01-01');
          const postedB = new Date(b.normalizedPosted || '1970-01-01');
          return postedB - postedA;
        case 'amount':
          const amountA = a.normalizedAmount || 0;
          const amountB = b.normalizedAmount || 0;
          return amountB - amountA;
        default:
          return 0;
      }
    });
  };

  // Combine all results
  const allResults = Object.keys(results).flatMap(key => results[key]);
  const totalResults = Object.values(pagination).reduce((sum, p) => sum + (p.total || 0), 0);

  const getFilteredResults = () => {
    let filtered;

    if (activeTab === 'all') {
      if (activeCategory === 'all') {
        filtered = allResults;
      } else {
        const sourcesInCategory = CATEGORIES[activeCategory]?.sources || [];
        filtered = allResults.filter(r => sourcesInCategory.includes(r.source));
      }
    } else if (activeTab === 'favorites') {
      filtered = filterStatus === 'all'
        ? favorites
        : favorites.filter(f => f.status === filterStatus);
    } else {
      filtered = results[activeTab] || [];
    }

    return sortResults(filtered);
  };

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

      if (f.normalizedDeadline) {
        const urgency = getDeadlineUrgency(f.normalizedDeadline);
        if (urgency.level === 'urgent') stats.urgentDeadlines++;
        if (urgency.level === 'soon') stats.soonDeadlines++;
      }
    });

    return stats;
  };

  const toggleSource = (source) => {
    setEnabledSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  const favoritesStats = getFavoritesStats();
  const filteredResults = getFilteredResults();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Comprehensive Grant Search
          </h1>
          <p className="text-xl text-blue-200">
            Search 10 federal & state databases in one place
          </p>
          <p className="text-sm text-blue-300 mt-2">
            Grants.gov | SAM.gov | USASpending | NIH | NSF | Federal RePORTER | ProPublica | FEMA | Regulations.gov | California
          </p>
        </div>

        <div className="card p-6 mb-6">
          {/* Search inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-white/80 text-sm mb-2">Search Keywords</label>
              <input
                type="text"
                placeholder="e.g., healthcare, infrastructure, climate..."
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

          {/* Source toggles */}
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-2">Data Sources</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DATA_SOURCES).map(([key, source]) => (
                <button
                  key={key}
                  onClick={() => toggleSource(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    enabledSources[key]
                      ? `${source.color} text-white`
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {source.name} {enabledSources[key] ? '✓' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Filters and search button */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onClick={() => searchGrants()}
                disabled={loading}
                className="btn-primary flex items-center gap-2 flex-1"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Searching {Object.values(enabledSources).filter(Boolean).length} sources...
                  </>
                ) : (
                  <>Search All Databases</>
                )}
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setAgency('');
                  setEligibility('');
                  setSamType('g');
                  setSortBy('relevance');
                  setResults({
                    grants: [], sam: [], usaspending: [], nihReporter: [],
                    nsf: [], federalReporter: [], propublica: [], fema: [],
                    regulations: [], california: []
                  });
                  setPagination(Object.fromEntries(
                    Object.keys(pagination).map(k => [k, { page: 1, totalPages: 0, total: 0 }])
                  ));
                  setErrors({});
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {errors.general && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {errors.general}
          </div>
        )}

        {/* Source Results Summary - Shows results breakdown per database */}
        {(allResults.length > 0 || Object.keys(errors).filter(k => k !== 'general').length > 0) && (
          <div className="card p-4 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>Search Results by Source</span>
              <span className="text-sm font-normal text-white/70">({totalResults} total across all databases)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(DATA_SOURCES).map(([key, source]) => {
                const count = results[key]?.length || 0;
                const total = pagination[key]?.total || 0;
                const hasError = errors[key];
                const isEnabled = enabledSources[key];

                return (
                  <div
                    key={key}
                    className={`p-2 rounded-lg text-sm ${
                      hasError
                        ? 'bg-red-500/20 border border-red-500/50'
                        : count > 0
                        ? 'bg-white/10'
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${hasError ? 'text-red-300' : 'text-white'}`}>
                        {source.name}
                      </span>
                      <span className={`font-bold ${
                        hasError ? 'text-red-400' : count > 0 ? 'text-green-400' : 'text-white/50'
                      }`}>
                        {!isEnabled ? 'OFF' : hasError ? '!' : count > 0 ? count : '0'}
                      </span>
                    </div>
                    {hasError && (
                      <p className="text-xs text-red-300 mt-1 truncate" title={errors[key]}>
                        {errors[key]}
                      </p>
                    )}
                    {!hasError && count > 0 && total > count && (
                      <p className="text-xs text-white/50 mt-1">
                        {total} total available
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results tabs */}
        {(allResults.length > 0 || favorites.length > 0) && (
          <>
            {/* Category filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => { setActiveTab('all'); setActiveCategory('all'); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'all' && activeCategory === 'all'
                    ? 'bg-white text-blue-900'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                All Results ({allResults.length})
              </button>
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const count = cat.sources.reduce((sum, src) => sum + (results[src]?.length || 0), 0);
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => { setActiveTab('all'); setActiveCategory(key); }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeCategory === key
                        ? 'bg-white text-blue-900'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
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

            {/* Source-specific tabs */}
            {activeTab === 'all' && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {Object.entries(DATA_SOURCES).map(([key, source]) => {
                  const count = results[key]?.length || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${source.badge}`}
                    >
                      {source.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Pagination for active source */}
        {activeTab !== 'all' && activeTab !== 'favorites' && pagination[activeTab]?.totalPages > 1 && (
          <div className="card p-3 mb-4 flex items-center justify-between">
            <span className="text-white/80 text-sm">
              {DATA_SOURCES[activeTab]?.name}: Page {pagination[activeTab].page} of {pagination[activeTab].totalPages} ({pagination[activeTab].total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => changePage(activeTab, pagination[activeTab].page - 1)}
                disabled={pagination[activeTab].page <= 1 || loading}
                className="px-3 py-1.5 rounded bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => changePage(activeTab, pagination[activeTab].page + 1)}
                disabled={pagination[activeTab].page >= pagination[activeTab].totalPages || loading}
                className="px-3 py-1.5 rounded bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Manager Controls for favorites */}
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
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={toggleSelectAll} className="text-sm text-white/70 hover:text-white underline">
                  {selectedForBulk.size === favorites.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedForBulk.size > 0 && (
                  <button onClick={bulkDeleteSelected} className="bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1.5 rounded text-sm">
                    Remove ({selectedForBulk.size})
                  </button>
                )}
                <button onClick={exportToCSV} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm">
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results grid */}
        <div className="grid gap-4">
          {filteredResults.map((opp, idx) => {
            const isInFavorites = activeTab === 'favorites';
            const deadlineUrgency = getDeadlineUrgency(opp.normalizedDeadline);
            const currentStatus = getGrantStatus(opp);
            const sourceConfig = DATA_SOURCES[opp.source] || {};

            return (
              <div
                key={`${opp.source}-${opp.normalizedId || idx}`}
                className={`grant-card ${isInFavorites && selectedForBulk.has(opp.id) ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  {isInFavorites && (
                    <input
                      type="checkbox"
                      checked={selectedForBulk.has(opp.id)}
                      onChange={() => toggleBulkSelection(opp.id)}
                      className="mt-1 mr-3 w-4 h-4"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${sourceConfig.badge}`}>
                        {sourceConfig.name?.toUpperCase() || opp.source.toUpperCase()}
                      </span>
                      {isInFavorites && (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${currentStatus.color}`}>
                          {currentStatus.icon} {currentStatus.label}
                        </span>
                      )}
                      {deadlineUrgency.level !== 'unknown' && (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${deadlineUrgency.bg} ${deadlineUrgency.color}`}>
                          {deadlineUrgency.label}
                        </span>
                      )}
                      {opp.piName && (
                        <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                          PI: {opp.piName}
                        </span>
                      )}
                      {opp.documentType && (
                        <span className="inline-block px-2 py-1 rounded text-xs bg-violet-100 text-violet-700">
                          {opp.documentType}
                        </span>
                      )}
                      {sortBy === 'relevance' && opp.relevanceScore > 0 && !isInFavorites && (
                        <span className="inline-block px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">
                          Score: {opp.relevanceScore}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {opp.normalizedTitle || 'Untitled'}
                    </h3>
                    {opp.organization && (
                      <p className="text-sm text-gray-600 mt-1">{opp.organization}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleFavorite(opp)}
                    className="text-2xl hover:scale-110 transition-transform ml-2"
                    title={isFavorite(opp) ? 'Remove from My Grants' : 'Add to My Grants'}
                  >
                    {isFavorite(opp) ? '★' : '☆'}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Agency/Source</span>
                    <span className="font-medium text-gray-900">{opp.normalizedAgency || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{opp.isNonprofit ? 'Revenue' : 'Award'}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(opp.normalizedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{opp.isNonprofit ? 'Location' : 'Deadline'}</span>
                    <span className={`font-medium ${deadlineUrgency.color}`}>
                      {opp.isNonprofit ? opp.normalizedAgency : formatDate(opp.normalizedDeadline)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{opp.isNonprofit ? 'EIN' : 'Posted'}</span>
                    <span className="font-medium text-gray-900">
                      {opp.isNonprofit ? opp.strEin : formatDate(opp.normalizedPosted)}
                    </span>
                  </div>
                </div>

                {opp.normalizedDescription && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{opp.normalizedDescription}</p>
                )}

                {/* Manager controls for favorites */}
                {isInFavorites && (
                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm">Status:</span>
                      <select
                        value={opp.status || 'interested'}
                        onChange={(e) => updateGrantStatus(opp.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {GRANT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                        ))}
                      </select>
                      <span className="text-gray-400 text-xs ml-auto">
                        Saved {opp.savedAt ? new Date(opp.savedAt).toLocaleDateString() : 'recently'}
                      </span>
                    </div>
                    <div>
                      {editingNote === opp.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your notes..."
                            className="w-full text-sm border border-gray-300 rounded px-3 py-2"
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
                              <button onClick={() => startEditingNote(opp)} className="text-xs text-blue-500 hover:text-blue-700 mt-2">
                                Edit note
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startEditingNote(opp)} className="text-sm text-gray-400 hover:text-gray-600">
                              + Add notes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {opp.normalizedLink && (
                  <div className={`flex gap-3 ${isInFavorites ? 'mt-3' : ''}`}>
                    <a
                      href={opp.normalizedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-medium text-sm hover:underline`}
                      style={{ color: sourceConfig.color?.replace('bg-', '').includes('-') ? undefined : '#3b82f6' }}
                    >
                      View on {sourceConfig.name || opp.source} →
                    </a>
                  </div>
                )}
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
                      Click the ☆ star on any grant to save it here.
                    </p>
                  </div>
                ) : (
                  <div className="text-white/70">
                    No grants match the selected filter. <button onClick={() => setFilterStatus('all')} className="underline hover:text-white">Show all</button>
                  </div>
                )
              ) : (
                <div className="text-white/70">
                  {allResults.length === 0 ? 'Enter a search term to find grants across 10 databases' : 'No results found. Try different search terms.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error messages */}
        {Object.keys(errors).filter(k => k !== 'general').length > 0 && (
          <div className="mt-4 text-sm text-yellow-200">
            {Object.entries(errors).filter(([k]) => k !== 'general').map(([source, error]) => (
              <p key={source}>{DATA_SOURCES[source]?.name || source}: {error}</p>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center text-white/50 text-sm py-8">
        <p>Data sourced from Grants.gov, SAM.gov, USASpending, NIH RePORTER, NSF, Federal RePORTER, ProPublica, FEMA, Regulations.gov, and California Grants Portal</p>
      </footer>
    </main>
  );
}
