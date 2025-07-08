import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useProperty } from '../contexts/PropertyContext';
import { api } from '../utils/api';
import { Building2, MessageSquare, Settings, Search, MapPin, Sparkles, Zap, Shield, AlertTriangle, Compass, Layers } from 'lucide-react';

interface Property {
  id: number;
  property_code: string;
  name: string;
  location: string;
  description: string;
  contact_info: string;
}

export default function Home() {
  const router = useRouter();
  const { selectedProperty, setSelectedProperty } = useProperty();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    // Filter properties based on search term
    if (searchTerm.trim() === '') {
      setFilteredProperties(properties);
    } else {
      const filtered = properties.filter(property => 
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.property_code.includes(searchTerm) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProperties(filtered);
    }
  }, [searchTerm, properties]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get('/properties');
      setProperties(response.data);
      setFilteredProperties(response.data);
    } catch (err) {
      setError('Failed to load properties');
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedProperty', JSON.stringify(property));
    }
  };

  const handleStartChat = () => {
    if (!selectedProperty) {
      setError('Please select a property first');
      return;
    }
    router.push('/chat');
  };

  const handleAdminAccess = () => {
    if (!selectedProperty) {
      setError('Please select a property first');
      return;
    }
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-30 animate-gradient"></div>
        <div className="text-center relative z-10">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-400 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-primary-400 opacity-30 mx-auto"></div>
          </div>
          <p className="text-gray-300 mt-4 animate-pulse">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Encore Architect</title>
        <meta name="description" content="AI-powered event planning and management for Encore venues" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-space-900 relative overflow-hidden">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-20 animate-gradient"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-accent-600/10"></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          {/* Enhanced Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex justify-center mb-8">
              <div className="relative p-6 rounded-3xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 backdrop-blur-sm border border-white/10 animate-pulse-glow">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-400/10 to-accent-400/10 animate-pulse"></div>
                <div className="relative flex items-center justify-center">
                  <Compass className="w-16 h-16 text-primary-400" />
                  <div className="absolute inset-0 rounded-full bg-primary-400/20 blur-xl animate-ping"></div>
                </div>
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-display font-bold mb-6 relative">
              <span className="gradient-text relative z-10">Encore</span>{' '}
              <span className="gradient-text relative z-10 bg-gradient-to-r from-accent-400 via-primary-400 to-electric-500 bg-clip-text">Architect</span>
              <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-primary-600 to-accent-600 animate-pulse"></div>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-medium">
              AI-powered event planning and management for your venue's inventory, labor, and requirements.
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4 leading-relaxed">
              Design exceptional events with intelligent automation and precision planning.
            </p>

            {/* Enhanced Feature badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-10">
              <div className="badge-info flex items-center bg-gradient-to-r from-primary-500/20 to-primary-600/20 backdrop-blur-sm border border-primary-400/30 px-6 py-3 rounded-full">
                <Zap className="w-5 h-5 mr-3 text-primary-400" />
                <span className="font-medium">Real-time AI</span>
              </div>
              <div className="badge-info flex items-center bg-gradient-to-r from-accent-500/20 to-accent-600/20 backdrop-blur-sm border border-accent-400/30 px-6 py-3 rounded-full">
                <Shield className="w-5 h-5 mr-3 text-accent-400" />
                <span className="font-medium">Property-Specific</span>
              </div>
              <div className="badge-info flex items-center bg-gradient-to-r from-electric-500/20 to-electric-600/20 backdrop-blur-sm border border-electric-400/30 px-6 py-3 rounded-full">
                <Sparkles className="w-5 h-5 mr-3 text-electric-400" />
                <span className="font-medium">Smart Proposals</span>
              </div>
            </div>
          </div>

          {/* Property Selection */}
          <div className="max-w-2xl mx-auto mb-12 animate-slide-up">
            <div className="glass-card-dark p-8 hover-card">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
                <div className="p-2 rounded-lg bg-primary-500/20 mr-3">
                  <Building2 className="w-5 h-5 text-primary-400" />
                </div>
                Select Property
              </h2>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by property name, code, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-12"
                />
              </div>

              {/* Property Dropdown */}
              <div className="relative">
                <select 
                  className="select-field"
                  value={selectedProperty?.id || ''}
                  onChange={(e) => {
                    const propertyId = parseInt(e.target.value);
                    const property = properties.find(p => p.id === propertyId);
                    if (property) {
                      handlePropertySelect(property);
                    }
                  }}
                >
                  <option value="">Choose a property...</option>
                  {filteredProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.property_code} - {property.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Details */}
              {selectedProperty && (
                <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm animate-scale-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg mb-2">
                        {selectedProperty.name}
                      </h3>
                      <p className="text-sm text-gray-300 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-accent-400" />
                        {selectedProperty.location}
                      </p>
                      <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                        {selectedProperty.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="badge-info">
                        Code: {selectedProperty.property_code}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Property List */}
              {searchTerm && filteredProperties.length > 0 && (
                <div className="mt-6 animate-slide-down">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Search Results ({filteredProperties.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {filteredProperties.slice(0, 10).map((property) => (
                      <button
                        key={property.id}
                        onClick={() => handlePropertySelect(property)}
                        className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-primary-400/50 transition-all duration-300 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white group-hover:text-primary-300 transition-colors">
                              {property.name}
                            </div>
                            <div className="text-sm text-gray-400">
                              {property.location}
                            </div>
                          </div>
                          <span className="text-sm font-mono text-accent-400">
                            {property.property_code}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-scale-in">
                  <p className="text-red-300 text-sm flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {error}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Role Toggle */}
          <div className="max-w-md mx-auto mb-8 animate-fade-in">
            <div className="flex items-center justify-center glass-card-dark py-4 px-6 rounded-full">
              <span className={`text-sm font-medium transition-all duration-300 ${!isAdmin ? 'text-primary-400' : 'text-gray-400'}`}>
                Sales Manager
              </span>
              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`mx-4 relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 ${
                  isAdmin ? 'bg-gradient-to-r from-primary-600 to-accent-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    isAdmin ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium transition-all duration-300 ${isAdmin ? 'text-accent-400' : 'text-gray-400'}`}>
                Admin
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {selectedProperty ? (
            <div className="max-w-md mx-auto animate-slide-up">
              <div className="space-y-4">
                {/* Chat Button */}
                <button
                  onClick={handleStartChat}
                  className="w-full btn-primary group flex items-center justify-center"
                >
                  <MessageSquare className="w-5 h-5 mr-3 group-hover:animate-pulse" />
                  Start AI Assistant
                </button>

                {/* Admin Button */}
                {isAdmin && (
                  <button
                    onClick={handleAdminAccess}
                    className="w-full btn-secondary group flex items-center justify-center"
                  >
                    <Settings className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                    Data Management
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto text-center animate-fade-in">
              <div className="glass-card-dark p-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Building2 className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Select a Property
                </h3>
                <p className="text-gray-400 mb-6">
                  Choose a property to start using the AI assistant or manage data.
                </p>
                <div className="text-sm text-gray-500 space-y-2">
                  <p className="flex items-center justify-center">
                    <Search className="w-4 h-4 mr-2 text-accent-400" />
                    Use the search bar to find properties by:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    <span className="badge-info text-xs">Property name</span>
                    <span className="badge-info text-xs">4-digit code</span>
                    <span className="badge-info text-xs">Location</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {properties.length > 0 && (
            <div className="mt-16 text-center animate-fade-in">
              <div className="inline-flex items-center space-x-8 text-sm text-gray-400">
                <span className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                  {properties.length} properties available
                </span>
                <span>•</span>
                <span>Chicago market focus</span>
                <span>•</span>
                <span className="flex items-center">
                  Real-time inventory
                  <div className="w-2 h-2 rounded-full bg-accent-400 ml-2 animate-pulse"></div>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 