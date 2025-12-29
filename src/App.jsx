import React, { useState, useEffect, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Download, 
  FileText, 
  Filter, 
  CheckSquare, 
  Square, 
  Package, 
  Search,
  BookOpen,
  Calendar,
  MapPin,
  Layers,
  AlertCircle,
  Check,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Archive
} from 'lucide-react';
import papers, { getYears, getSubjects, getRegions, getTypes, getMirrorUrl } from './paperDatabase';

function App() {
  // Filter states
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection states
  const [selectedPapers, setSelectedPapers] = useState(new Set());
  const [downloadingPapers, setDownloadingPapers] = useState(new Set());
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({ total: 0, filtered: 0, selected: 0 });

  // Get filter options
  const years = useMemo(() => getYears(), []);
  const subjects = useMemo(() => getSubjects(), []);
  const regions = useMemo(() => getRegions(), []);
  const types = useMemo(() => getTypes(), []);

  // Filter papers
  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      const matchYear = selectedYear === 'all' || paper.year === parseInt(selectedYear);
      const matchSubject = selectedSubject === 'all' || paper.subject === selectedSubject;
      const matchRegion = selectedRegion === 'all' || paper.region === selectedRegion;
      const matchType = selectedType === 'all' || paper.type === selectedType;
      const matchSearch = searchQuery === '' || 
        paper.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.year.toString().includes(searchQuery);
      
      return matchYear && matchSubject && matchRegion && matchType && matchSearch;
    });
  }, [selectedYear, selectedSubject, selectedRegion, selectedType, searchQuery]);

  // Update stats
  useEffect(() => {
    setStats({
      total: papers.length,
      filtered: filteredPapers.length,
      selected: selectedPapers.size
    });
  }, [filteredPapers, selectedPapers]);

  // Toggle paper selection
  const togglePaperSelection = (paperId) => {
    setSelectedPapers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  // Select all filtered papers
  const selectAllFiltered = () => {
    setSelectedPapers(new Set(filteredPapers.map(p => p.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedPapers(new Set());
  };

  // Download single paper (direct PDF download)
  const downloadSinglePaper = async (paper) => {
    setDownloadingPapers(prev => new Set([...prev, paper.id]));
    setDownloadProgress(prev => ({ ...prev, [paper.id]: 0 }));

    try {
      // Use CORS proxy for cross-origin requests
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const targetUrl = encodeURIComponent(paper.url);
      
      const response = await fetch(proxyUrl + targetUrl);
      
      if (!response.ok) {
        // Try mirror URLs
        const mirrors = getMirrorUrl(paper);
        for (const mirrorUrl of mirrors) {
          try {
            const mirrorResponse = await fetch(proxyUrl + encodeURIComponent(mirrorUrl));
            if (mirrorResponse.ok) {
              const blob = await mirrorResponse.blob();
              saveAs(blob, paper.fileName);
              setDownloadProgress(prev => ({ ...prev, [paper.id]: 100 }));
              return;
            }
          } catch (e) {
            continue;
          }
        }
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      setDownloadProgress(prev => ({ ...prev, [paper.id]: 100 }));
      saveAs(blob, paper.fileName);
    } catch (error) {
      console.error('Download failed:', error);
      // Open in new tab as fallback
      window.open(paper.url, '_blank');
    } finally {
      setTimeout(() => {
        setDownloadingPapers(prev => {
          const newSet = new Set(prev);
          newSet.delete(paper.id);
          return newSet;
        });
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[paper.id];
          return newProgress;
        });
      }, 1000);
    }
  };

  // Download multiple papers as ZIP
  const downloadAsZip = async () => {
    if (selectedPapers.size === 0) return;

    setIsCreatingZip(true);
    setZipProgress(0);

    const zip = new JSZip();
    const selectedPaperList = papers.filter(p => selectedPapers.has(p.id));
    const totalPapers = selectedPaperList.length;
    let completedPapers = 0;

    // Group papers by subject for organization
    const folders = {};

    for (const paper of selectedPaperList) {
      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(proxyUrl + encodeURIComponent(paper.url));
        
        if (response.ok) {
          const blob = await response.blob();
          const folderName = paper.subjectName.replace(/ /g, '_');
          
          if (!folders[folderName]) {
            folders[folderName] = zip.folder(folderName);
          }
          
          folders[folderName].file(paper.fileName, blob);
        }
      } catch (error) {
        console.error(`Failed to fetch ${paper.fileName}:`, error);
      }

      completedPapers++;
      setZipProgress(Math.round((completedPapers / totalPapers) * 100));
    }

    // Generate and download ZIP
    try {
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        setZipProgress(Math.round(metadata.percent));
      });

      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(content, `CBSE_Papers_${timestamp}.zip`);
    } catch (error) {
      console.error('ZIP creation failed:', error);
      alert('Failed to create ZIP file. Please try downloading papers individually.');
    }

    setIsCreatingZip(false);
    setZipProgress(0);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedYear('all');
    setSelectedSubject('all');
    setSelectedRegion('all');
    setSelectedType('all');
    setSearchQuery('');
  };

  // Get badge color based on type
  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'question_paper': return 'bg-blue-100 text-blue-800';
      case 'marking_scheme': return 'bg-green-100 text-green-800';
      case 'sample_paper': return 'bg-purple-100 text-purple-800';
      case 'sample_marking_scheme': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get readable type name
  const getTypeName = (type) => {
    switch (type) {
      case 'question_paper': return 'Question Paper';
      case 'marking_scheme': return 'Marking Scheme';
      case 'sample_paper': return 'Sample Paper';
      case 'sample_marking_scheme': return 'Sample MS';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-10 w-10" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">CBSE Class 12 Past Papers</h1>
                <p className="text-blue-100 text-sm sm:text-base">2015-2025 | All Regions & Sets | Question Papers & Marking Schemes</p>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm text-blue-100">6 Subjects</p>
              <p className="text-lg font-semibold">{stats.total} Papers</p>
            </div>
          </div>
        </div>
      </header>

      {/* Subject chips */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 mr-2">Subjects:</span>
            {['Accountancy', 'Business Studies', 'Data Science', 'Economics', 'English', 'Mathematics'].map(sub => (
              <span key={sub} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {sub}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{stats.filtered}</span> of {stats.total} papers
              </span>
            </div>
            {stats.selected > 0 && (
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">
                  {stats.selected} selected
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {stats.selected > 0 && (
              <button
                onClick={downloadAsZip}
                disabled={isCreatingZip}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingZip ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating ZIP ({zipProgress}%)
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Download {stats.selected} as ZIP
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 mr-2 text-gray-500" />
              Filters
            </h2>
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search papers..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <BookOpen className="inline h-4 w-4 mr-1" />
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map(sub => (
                  <option key={sub.code} value={sub.code}>{sub.name}</option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Region/Set
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Filter + Selection Buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Types
              </button>
              {types.map(type => (
                <button
                  key={type.code}
                  onClick={() => setSelectedType(type.code)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedType === type.code ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={selectAllFiltered}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All Filtered
              </button>
              {selectedPapers.size > 0 && (
                <button
                  onClick={deselectAll}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Papers List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredPapers.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No papers found</h3>
              <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">Select</div>
                <div className="col-span-3">Subject</div>
                <div className="col-span-1">Year</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Region/Set</div>
                <div className="col-span-1">Source</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Paper Items */}
              {filteredPapers.map(paper => (
                <div
                  key={paper.id}
                  className={`px-4 md:px-6 py-4 hover:bg-gray-50 transition-colors ${
                    selectedPapers.has(paper.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center space-y-3 md:space-y-0">
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <button
                        onClick={() => togglePaperSelection(paper.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {selectedPapers.has(paper.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Subject */}
                    <div className="col-span-3">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{paper.subjectName}</p>
                          <p className="text-xs text-gray-500 truncate">{paper.fileName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Year */}
                    <div className="col-span-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {paper.year}
                      </span>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(paper.type)}`}>
                        {getTypeName(paper.type)}
                      </span>
                    </div>

                    {/* Region/Set */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-700">{paper.region}</p>
                      <p className="text-xs text-gray-500">{paper.set}</p>
                    </div>

                    {/* Source */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center text-xs ${
                        paper.source.includes('Official') ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {paper.verified && <Check className="h-3 w-3 mr-1" />}
                        {paper.source.includes('Official') ? 'Official' : 'Mirror'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => downloadSinglePaper(paper)}
                        disabled={downloadingPapers.has(paper.id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingPapers.has(paper.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            {downloadProgress[paper.id] || 0}%
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </>
                        )}
                      </button>
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">About This Resource</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Available Papers:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Question Papers from 2015 to 2025</li>
                <li>Marking Schemes for all years</li>
                <li>All regions: Delhi, All India, Foreign</li>
                <li>Multiple sets per exam</li>
                <li>Compartment exam papers</li>
                <li>Sample papers with marking schemes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Subjects Covered:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Accountancy</strong> (Code: 055)</li>
                <li><strong>Business Studies</strong> (Code: 054)</li>
                <li><strong>Data Science</strong> (Code: 844) - 2021 onwards</li>
                <li><strong>Economics</strong> (Code: 058)</li>
                <li><strong>English Core</strong> (Code: 301)</li>
                <li><strong>Mathematics</strong> (Code: 041)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              <strong>Note:</strong> All papers are sourced from CBSE's official website and verified mirror sites. 
              Data Science papers are only available from 2021 onwards as the subject was introduced recently.
              If a direct download fails, the paper will open in a new tab.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              CBSE Class 12 Past Papers Archive | 2015-2025
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Papers sourced from official CBSE website (cbse.gov.in) and verified educational portals.
              This is an educational resource for students preparing for CBSE Board Examinations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
