import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../utils/api';

export interface Property {
  id: number;
  property_code: string;
  name: string;
  location: string;
  description: string;
  contact_info: string;
  created_at?: string;
  updated_at?: string;
}

interface PropertyContextType {
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  properties: Property[];
  loadProperties: () => Promise<void>;
  isLoading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};

interface PropertyProviderProps {
  children: ReactNode;
}

export const PropertyProvider: React.FC<PropertyProviderProps> = ({ children }) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/properties');
      setProperties(response.data);
      
      // Only restore from localStorage if available, don't auto-select first property
      if (!selectedProperty && response.data.length > 0) {
        // Check localStorage only on client side
        let savedPropertyId: string | null = null;
        if (typeof window !== 'undefined') {
          savedPropertyId = localStorage.getItem('selectedPropertyId');
        }
        
        if (savedPropertyId) {
          const savedProperty = response.data.find(
            (p: Property) => p.id === parseInt(savedPropertyId)
          );
          if (savedProperty) {
            setSelectedProperty(savedProperty);
          }
          // Don't auto-select first property - let user choose
        }
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSelectedProperty = (property: Property | null) => {
    setSelectedProperty(property);
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      if (property) {
        localStorage.setItem('selectedPropertyId', property.id.toString());
      } else {
        localStorage.removeItem('selectedPropertyId');
      }
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const value: PropertyContextType = {
    selectedProperty,
    setSelectedProperty: handleSetSelectedProperty,
    properties,
    loadProperties,
    isLoading,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}; 