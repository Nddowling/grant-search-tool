'use client';

import { useState } from 'react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [agency, setAgency] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [results, setResults] = useState({ grants: [], sam: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [favorites, setFavorites] = useState([]);

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
        fetch(`/api/sam?keyword=${encodeURIComponent(searchQuery)}&agency=${encodeURIComponent(agency)}`)
      ]);

      const grantsData = grantsRes.status === 'fulfilled' && grantsRes.value.ok
        ? await grantsRes.value.json()
        : { opportunities: [], error: 'Grants.gov search failed' };

      const samData = samRes.status === 'fulfilled' && samRes.value.ok
        ? await samRes.value.json()
        : { opportunities: [], error: 'SAM.gov search failed' };

      setResults({
        grants: grantsData.opportunities || [],
        sam: samData.opportunities || [],
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
      newFavorites = [...favorites, { ...opportunity, id, source }];
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

  const allResults = [
    ...results.grants.map(g => ({ ...g, source: 'grants' })),
    ...results.sam.map(s => ({ ...s, source: 'sam' }))
  ];

  const filteredResults = activeTab === 'all'
    ? allResults
    : activeTab === 'grants'
      ? results.grants.map(g => ({ ...g, source: 'grants' }))
      : activeTab === 'sam'
        ? results.sam.map(s => ({ ...s, source: 'sam' }))
        : favorites;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🏛️ Federal Grant Search
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
                placeholder="e.g., infrastructure, rural development, broadband..."
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
                placeholder="e.g., DOT, EPA, USDA..."
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

          <div className="flex gap-4 justify-center">
            <button
              onClick={searchGrants}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Searching...
                </>
              ) : (
                <>
                  🔍 Search Grants
                </>
              )}
            </button>
            <button
              onClick={() => { setSearchQuery(''); setAgency(''); setEligibility(''); setResults({ grants: [], sam: [] }); }}
              className="btn-secondary"
            >
              Clear
            </button>
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
              ⭐ Favorites ({favorites.length})
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
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${
                    opp.source === 'grants' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {opp.source === 'grants' ? 'GRANTS.GOV' : 'SAM.GOV'}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    {opp.title || opp.opportunityTitle || 'Untitled Opportunity'}
                  </h3>
                </div>
                <button
                  onClick={() => toggleFavorite(opp, opp.source)}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  {isFavorite(opp, opp.source) ? '⭐' : '☆'}
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
            {results.grantsError && <p>⚠️ Grants.gov: {results.grantsError}</p>}
            {results.samError && <p>⚠️ SAM.gov: {results.samError}</p>}
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
