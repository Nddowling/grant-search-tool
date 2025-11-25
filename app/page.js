'use client';

import { useState, useEffect } from 'react';

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
      newFavorites = [...favorites, { ...opportunity, id, source, savedAt: new Date().toISOString() }];
    }

    setFavorites(newFavorites);
  };

  const isFavorite = (opportunity, source) => {
    const id = `${source}-${opportunity.id || opportunity.noticeId}`;
    return favorites.some(f => f.id === id);
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
      filtered = favorites;
    }
    return sortResults(filtered);
  };

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
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'favorites'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Favorites ({favorites.length})
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {filteredResults.map((opp, idx) => (
            <div
              key={`${opp.source}-${opp.id || opp.noticeId || idx}`}
              className={`grant-card ${opp.source === 'grants' ? 'grants-gov' : 'sam-gov'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
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
                    {sortBy === 'relevance' && opp.relevanceScore > 0 && (
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
                  className="text-2xl hover:scale-110 transition-transform"
                  title={isFavorite(opp, opp.source) ? 'Remove from favorites' : 'Add to favorites'}
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
                  <span className="font-medium text-gray-900">
                    {formatDate(opp.closeDate || opp.responseDeadLine || opp.archiveDate)}
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

              <div className="flex gap-3">
                {opp.source === 'grants' && opp.id && (
                  <a
                    href={`https://www.grants.gov/search-results-detail/${opp.id}`}
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
          ))}

          {filteredResults.length === 0 && !loading && (
            <div className="text-center py-12 text-white/70">
              {activeTab === 'favorites'
                ? 'No favorites saved yet. Click ☆ on any grant to save it!'
                : 'No results found. Try different search terms.'}
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
