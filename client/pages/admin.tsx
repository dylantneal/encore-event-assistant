import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useProperty } from '../contexts/PropertyContext';
import { api, roomsAPI, unionsAPI, importAPI, inventoryAPI } from '../utils/api';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  AlertTriangle, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Building2,
  Users,
  Wrench,
  Search,
  Package,
  Database,
  FileUp,
  CheckCircle,
  Zap,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Room {
  id: number;
  property_id: number;
  name: string;
  capacity: number | null;
  dimensions: string;
  built_in_av: string;
  features: string;
}

interface Union {
  id: number;
  property_id: number;
  local_number: string;
  name: string;
  trade: string;
  regular_hours_start: string;
  regular_hours_end: string;
  regular_rate: number | null;
  overtime_rate: number | null;
  doubletime_rate: number | null;
  overtime_threshold: number;
  doubletime_threshold: number;
  weekend_rules: string;
  holiday_rules: string;
  contact_info: string;
  notes: string;
  schedule_count?: number;
  equipment_requirement_count?: number;
  venue_rule_count?: number;
}

interface InventoryItem {
  id: number;
  property_id: number;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  quantity_available: number;
  status: string;
  asset_tag: string;
  model: string;
  manufacturer: string;
  condition_notes: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { selectedProperty } = useProperty();
  const [activeTab, setActiveTab] = useState<'inventory' | 'rooms' | 'unions'>('inventory');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingUnion, setEditingUnion] = useState<Union | null>(null);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadSection, setShowUploadSection] = useState(false);

  // Auto-save form data to localStorage
  useEffect(() => {
    if (editingRoom && selectedProperty) {
      localStorage.setItem(`editing-room-${selectedProperty.id}`, JSON.stringify(editingRoom));
      setHasUnsavedChanges(true);
    } else {
      if (selectedProperty) {
        localStorage.removeItem(`editing-room-${selectedProperty.id}`);
      }
      setHasUnsavedChanges(false);
    }
  }, [editingRoom, selectedProperty]);

  useEffect(() => {
    if (editingUnion && selectedProperty) {
      localStorage.setItem(`editing-union-${selectedProperty.id}`, JSON.stringify(editingUnion));
      setHasUnsavedChanges(true);
    } else {
      if (selectedProperty) {
        localStorage.removeItem(`editing-union-${selectedProperty.id}`);
      }
      setHasUnsavedChanges(false);
    }
  }, [editingUnion, selectedProperty]);

  // Restore unsaved form data on page load
  useEffect(() => {
    if (selectedProperty && typeof window !== 'undefined') {
      const savedRoom = localStorage.getItem(`editing-room-${selectedProperty.id}`);
      const savedUnion = localStorage.getItem(`editing-union-${selectedProperty.id}`);
      
      if (savedRoom && !editingRoom) {
        try {
          const parsedRoom = JSON.parse(savedRoom);
          setEditingRoom(parsedRoom);
          toast('Restored unsaved room data', { icon: '💾' });
        } catch (e) {
          localStorage.removeItem(`editing-room-${selectedProperty.id}`);
        }
      }
      
      if (savedUnion && !editingUnion) {
        try {
          const parsedUnion = JSON.parse(savedUnion);
          setEditingUnion(parsedUnion);
          toast('Restored unsaved union data', { icon: '💾' });
        } catch (e) {
          localStorage.removeItem(`editing-union-${selectedProperty.id}`);
        }
      }
    }
  }, [selectedProperty]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || isUploading) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handleRouteChange = (url: string) => {
      if (hasUnsavedChanges || isUploading) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmed) {
          router.events.emit('routeChangeError');
          throw 'Route change aborted';
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [hasUnsavedChanges, isUploading, router]);

  useEffect(() => {
    if (selectedProperty) {
      loadRooms();
      loadUnions();
      loadInventory();
    }
  }, [selectedProperty]);

  const loadRooms = async () => {
    if (!selectedProperty) return;
    
    try {
      const response = await roomsAPI.getAll(selectedProperty.id);
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      toast.error('Failed to load rooms');
    }
  };

  const loadUnions = async () => {
    if (!selectedProperty) {
      console.log('No selected property, skipping union load');
      return;
    }
    
    console.log('Loading unions for property:', selectedProperty.id, selectedProperty.name, selectedProperty.property_code);
    
    try {
      const response = await unionsAPI.getAll(selectedProperty.id);
      console.log('Unions API response:', response);
      console.log('Response data:', response.data);
      console.log('Is response.data an array?', Array.isArray(response.data));
      
      // The API returns {success: true, data: [...]}
      // So we need response.data.data for the actual unions array
      const actualData = response.data.data || response.data;
      console.log('Actual data:', actualData);
      console.log('Is actual data an array?', Array.isArray(actualData));
      
      // Ensure we have an array
      const unionsData = Array.isArray(actualData) ? actualData : [];
      console.log('Setting unions to:', unionsData);
      setUnions(unionsData);
    } catch (error) {
      console.error('Failed to load unions:', error);
      toast.error('Failed to load unions');
      setUnions([]); // Set to empty array on error
    }
  };

  const loadInventory = async () => {
    if (!selectedProperty) return;
    
    try {
      const response = await inventoryAPI.getAll(selectedProperty.id);
      // Handle the response format { items: [...], total: number }
      const inventoryData = response.data?.items || response.data || [];
      // Ensure we always have an array
      const inventoryArray = Array.isArray(inventoryData) ? inventoryData : [];
      setInventory(inventoryArray);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
      setInventory([]); // Set to empty array on error
    }
  };

  const saveInventoryItem = async (item: Partial<InventoryItem>) => {
    if (!selectedProperty) return;

    try {
      const itemData = {
        ...item,
        property_id: selectedProperty.id,
        quantity_available: item.quantity_available || 0,
      };

      if (item.id) {
        await inventoryAPI.update(item.id, itemData);
        toast.success('Inventory item updated successfully');
      } else {
        await inventoryAPI.create(itemData);
        toast.success('Inventory item created successfully');
      }

      setEditingInventory(null);
      loadInventory();
    } catch (error: any) {
      console.error('Failed to save inventory item:', error);
      toast.error(error.response?.data?.message || 'Failed to save inventory item');
    }
  };

  const deleteInventoryItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;

    try {
      await inventoryAPI.delete(id);
      toast.success('Inventory item deleted successfully');
      loadInventory();
    } catch (error: any) {
      console.error('Failed to delete inventory item:', error);
      toast.error(error.response?.data?.message || 'Failed to delete inventory item');
    }
  };

  const replaceInventory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProperty) return;

    const confirmed = window.confirm(
      'This will REPLACE all existing inventory for this property. Are you sure you want to continue?'
    );
    
    if (!confirmed) {
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress('Replacing inventory...');

    try {
      const response = await importAPI.uploadInventory(selectedProperty.id, file, true);
      
      toast.success(`Successfully replaced inventory with ${response.data.imported} items!`);
      loadInventory();
    } catch (error: any) {
      console.error('Replace failed:', error);
      toast.error(error.response?.data?.message || 'Replace failed');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    toast.success('Template download will be available soon');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProperty) return;

    setIsUploading(true);
    setUploadProgress('Uploading file...');

    try {
      const response = await importAPI.uploadInventory(selectedProperty.id, file, false);
      
      // Store upload info for display
      if (typeof window !== 'undefined') {
        const uploadInfo = {
          filename: file.name,
          timestamp: new Date().toISOString(),
          results: response.data
        };
        localStorage.setItem(`last-upload-${selectedProperty.id}`, JSON.stringify(uploadInfo));
      }

      toast.success(`Successfully imported ${response.data.imported} items!`);
      if (response.data.errors?.length > 0) {
        toast.error(`${response.data.errors.length} items had errors`);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      event.target.value = '';
    }
  };

  const saveRoom = async (room: Partial<Room>) => {
    if (!selectedProperty) return;

    try {
      const roomData = {
        ...room,
        property_id: selectedProperty.id,
      };

      if (room.id) {
        await roomsAPI.update(room.id, roomData);
        toast.success('Room updated successfully');
      } else {
        await roomsAPI.create(roomData);
        toast.success('Room created successfully');
      }

      // Clear saved form data after successful save
      if (selectedProperty) {
        localStorage.removeItem(`editing-room-${selectedProperty.id}`);
      }

      setEditingRoom(null);
      setHasUnsavedChanges(false);
      loadRooms();
    } catch (error: any) {
      console.error('Failed to save room:', error);
      toast.error(error.response?.data?.message || 'Failed to save room');
    }
  };

  const deleteRoom = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      await roomsAPI.delete(id);
      toast.success('Room deleted successfully');
      loadRooms();
    } catch (error: any) {
      console.error('Failed to delete room:', error);
      toast.error(error.response?.data?.message || 'Failed to delete room');
    }
  };

  const saveUnion = async (union: Partial<Union>) => {
    if (!selectedProperty) return;

    console.log('Saving union for property:', selectedProperty.id, selectedProperty.name); // Debug log

    try {
      const unionData = {
        ...union,
        property_id: selectedProperty.id,
        regular_rate: union.regular_rate ? parseFloat(union.regular_rate.toString()) : null,
        overtime_rate: union.overtime_rate ? parseFloat(union.overtime_rate.toString()) : null,
        doubletime_rate: union.doubletime_rate ? parseFloat(union.doubletime_rate.toString()) : null,
        overtime_threshold: union.overtime_threshold || 8,
        doubletime_threshold: union.doubletime_threshold || 12,
      };

      console.log('Union data being sent:', unionData); // Debug log

      if (union.id) {
        await unionsAPI.update(union.id, unionData);
        toast.success('Union updated successfully');
      } else {
        await unionsAPI.create(unionData);
        toast.success('Union created successfully');
      }

      // Clear saved form data after successful save
      if (selectedProperty) {
        localStorage.removeItem(`editing-union-${selectedProperty.id}`);
      }

      setEditingUnion(null);
      setHasUnsavedChanges(false);
      loadUnions();
    } catch (error: any) {
      console.error('Failed to save union:', error);
      if (error.response?.data?.errors) {
        toast.error(`Validation failed: ${error.response.data.errors.join(', ')}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to save union');
      }
    }
  };

  const deleteUnion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this union? This will also delete all associated schedules, equipment requirements, and venue rules.')) {
      return;
    }

    try {
      await unionsAPI.delete(id);
      toast.success('Union deleted successfully');
      loadUnions();
    } catch (error: any) {
      console.error('Failed to delete union:', error);
      toast.error(error.response?.data?.message || 'Failed to delete union');
    }
  };

  // Show last upload info if available
  useEffect(() => {
    if (selectedProperty && typeof window !== 'undefined') {
      const lastUpload = localStorage.getItem(`last-upload-${selectedProperty.id}`);
      if (lastUpload) {
        try {
          const uploadData = JSON.parse(lastUpload);
          const uploadTime = new Date(uploadData.timestamp);
          const timeDiff = Date.now() - uploadTime.getTime();
          
          // Show info if upload was within last 5 minutes
          if (timeDiff < 5 * 60 * 1000) {
            toast.success(`Recent upload: ${uploadData.filename} - ${uploadData.results.imported} items imported`, {
              duration: 6000,
              icon: '📊'
            });
          }
        } catch (e) {
          localStorage.removeItem(`last-upload-${selectedProperty.id}`);
        }
      }
    }
  }, [selectedProperty]);

  if (!selectedProperty) {
    return (
      <div className="min-h-screen bg-space-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-20 animate-gradient"></div>
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-bold text-white mb-4">No Property Selected</h1>
          <p className="text-gray-400 mb-6">Please select a property to access admin features.</p>
          <Link href="/" className="btn-primary">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin - Encore FlightDeck</title>
        <meta name="description" content="Property administration and data management" />
      </Head>

      <div className="min-h-screen bg-space-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-10 animate-gradient"></div>
        
        {/* Header */}
        <header className="glass-card-dark border-b border-white/10 px-4 py-4 relative z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="icon-btn mr-4 group">
                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-white flex items-center">
                  <Database className="w-6 h-6 mr-3 text-primary-400" />
                  Property Administration
                </h1>
                <p className="text-sm text-gray-400">{selectedProperty.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="badge-success animate-pulse">
                <CheckCircle className="w-3 h-3 mr-1" />
                All saved
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Tabs */}
            <div className="flex space-x-1 mb-8 p-1 bg-white/5 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'inventory'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Package className="w-5 h-5 mr-2" />
                Inventory ({inventory.length})
              </button>
              <button
                onClick={() => setActiveTab('rooms')}
                className={`flex-1 flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'rooms'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-5 h-5 mr-2" />
                Rooms ({rooms.length})
              </button>
              <button
                onClick={() => setActiveTab('unions')}
                className={`flex-1 flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'unions'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-5 h-5 mr-2" />
                Unions ({unions.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
              {activeTab === 'inventory' && (
                <div>
                  <div className="glass-card-dark p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                      <h2 className="text-xl font-semibold text-white mb-4 sm:mb-0">
                        Inventory Management
                      </h2>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setShowUploadSection(!showUploadSection)}
                          className="btn-secondary text-sm flex items-center"
                        >
                          <FileUp className="w-4 h-4 mr-2" />
                          Import/Replace
                        </button>
                        <button
                          onClick={() => setEditingInventory({ property_id: selectedProperty.id } as InventoryItem)}
                          className="btn-primary text-sm flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </button>
                      </div>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search inventory..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="input-field pl-12 w-full"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="select-field w-full sm:w-auto"
                      >
                        <option value="all">All Categories</option>
                        <option value="Audio">Audio</option>
                        <option value="Video">Video</option>
                        <option value="Lighting">Lighting</option>
                        <option value="Staging">Staging</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Import/Upload Section */}
                    {showUploadSection && (
                      <div className="mb-6 p-6 bg-white/5 rounded-xl border border-white/10 animate-slide-down">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                          <Upload className="w-5 h-5 mr-2 text-accent-400" />
                          Import Inventory Data
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Add to existing inventory
                              </label>
                              <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="hidden"
                                id="file-upload"
                              />
                              <label
                                htmlFor="file-upload"
                                className="btn-secondary text-sm flex items-center justify-center cursor-pointer"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Choose File
                              </label>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Replace all inventory
                              </label>
                              <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={replaceInventory}
                                disabled={isUploading}
                                className="hidden"
                                id="replace-upload"
                              />
                              <label
                                htmlFor="replace-upload"
                                className="btn-danger text-sm flex items-center justify-center cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Replace All
                              </label>
                            </div>
                          </div>
                          <div className="glass-card p-4">
                            <h4 className="font-medium text-white mb-2">File Format</h4>
                            <p className="text-sm text-gray-400 mb-3">
                              Upload a CSV or Excel file with the following columns:
                            </p>
                            <ul className="text-xs text-gray-500 space-y-1">
                              <li>• Name (required)</li>
                              <li>• Category (required)</li>
                              <li>• Quantity Available</li>
                              <li>• Description</li>
                              <li>• Model, Manufacturer</li>
                            </ul>
                            <button
                              onClick={downloadTemplate}
                              className="mt-4 text-accent-400 hover:text-accent-300 text-sm flex items-center"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download Template
                            </button>
                          </div>
                        </div>
                        {uploadProgress && (
                          <div className="mt-4 p-3 bg-primary-500/10 rounded-lg">
                            <p className="text-sm text-primary-300 flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-400 border-t-transparent mr-2"></div>
                              {uploadProgress}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="glass-card p-4 text-center">
                        <div className="text-3xl font-bold gradient-text">{inventory.length}</div>
                        <div className="text-sm text-gray-400">Total Items</div>
                      </div>
                      <div className="glass-card p-4 text-center">
                        <div className="text-3xl font-bold text-accent-400">
                          {inventory.filter(item => item.status === 'available').length}
                        </div>
                        <div className="text-sm text-gray-400">Available</div>
                      </div>
                      <div className="glass-card p-4 text-center">
                        <div className="text-3xl font-bold text-primary-400">
                          {new Set(inventory.map(item => item.category)).size}
                        </div>
                        <div className="text-sm text-gray-400">Categories</div>
                      </div>
                      <div className="glass-card p-4 text-center">
                        <div className="text-3xl font-bold text-electric-500">
                          {inventory.reduce((sum, item) => sum + (item.quantity_available || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-400">Total Quantity</div>
                      </div>
                    </div>

                    {/* Inventory Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-white/10">
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Item Details
                            </th>
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="pb-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {inventory
                            .filter(item => {
                              const matchesSearch = searchTerm === '' || 
                                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.asset_tag?.toLowerCase().includes(searchTerm.toLowerCase());
                              const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
                              return matchesSearch && matchesCategory;
                            })
                            .map((item) => (
                              <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                                <td className="py-4 pr-4">
                                  <div>
                                    <div className="font-medium text-white">{item.name}</div>
                                    {item.description && (
                                      <div className="text-sm text-gray-400 mt-1">{item.description}</div>
                                    )}
                                    {item.asset_tag && (
                                      <div className="text-xs text-gray-500 mt-1">Tag: {item.asset_tag}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 pr-4">
                                  <span className="badge-info">
                                    {item.category}
                                  </span>
                                  {item.sub_category && (
                                    <div className="text-xs text-gray-500 mt-1">{item.sub_category}</div>
                                  )}
                                </td>
                                <td className="py-4 pr-4">
                                  <div className="text-white font-medium">{item.quantity_available || 0}</div>
                                </td>
                                <td className="py-4 pr-4">
                                  <span className={item.status === 'available' ? 'badge-success' : 'badge-warning'}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-4 text-right">
                                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditingInventory(item)}
                                      className="icon-btn"
                                    >
                                      <Edit2 className="w-4 h-4 text-primary-400" />
                                    </button>
                                    <button
                                      onClick={() => deleteInventoryItem(item.id)}
                                      className="icon-btn"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {inventory.length === 0 && (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">No inventory items yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rooms' && (
                <div>
                  <div className="glass-card-dark p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-white">
                        Room Management
                      </h2>
                      <button
                        onClick={() => setEditingRoom({ property_id: selectedProperty.id } as Room)}
                        className="btn-primary text-sm flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Room
                      </button>
                    </div>

                    {/* Rooms List */}
                    <div className="grid gap-4">
                      {rooms.map((room) => (
                        <div key={room.id} className="glass-card p-6 hover-card group">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-lg mb-3">{room.name}</h3>
                              <div className="space-y-2 text-sm">
                                {room.capacity && (
                                  <div className="flex items-center text-gray-300">
                                    <Users className="w-4 h-4 mr-2 text-primary-400" />
                                    <span>Capacity: <span className="text-white font-medium">{room.capacity} people</span></span>
                                  </div>
                                )}
                                {room.dimensions && (
                                  <div className="flex items-start text-gray-300">
                                    <span className="text-accent-400 mr-2">•</span>
                                    <span>Dimensions: <span className="text-white">{room.dimensions}</span></span>
                                  </div>
                                )}
                                {room.built_in_av && (
                                  <div className="flex items-start text-gray-300">
                                    <span className="text-accent-400 mr-2">•</span>
                                    <span>Built-in AV: <span className="text-white">{room.built_in_av}</span></span>
                                  </div>
                                )}
                                {room.features && (
                                  <div className="flex items-start text-gray-300">
                                    <span className="text-accent-400 mr-2">•</span>
                                    <span>Features: <span className="text-white">{room.features}</span></span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingRoom(room)}
                                className="icon-btn"
                              >
                                <Edit2 className="w-4 h-4 text-primary-400" />
                              </button>
                              <button
                                onClick={() => deleteRoom(room.id)}
                                className="icon-btn"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {rooms.length === 0 && (
                        <div className="text-center py-12">
                          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">No rooms configured yet. Add your first room to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'unions' && (
                <div>
                  <div className="glass-card-dark p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-white">
                        Union Management
                      </h2>
                      <button
                        onClick={() => setEditingUnion({
                          id: 0,
                          property_id: selectedProperty?.id || 0,
                          local_number: '',
                          name: '',
                          trade: '',
                          regular_hours_start: '08:00',
                          regular_hours_end: '17:00',
                          regular_rate: null,
                          overtime_rate: null,
                          doubletime_rate: null,
                          overtime_threshold: 8,
                          doubletime_threshold: 12,
                          weekend_rules: '',
                          holiday_rules: '',
                          contact_info: '',
                          notes: ''
                        } as Union)}
                        className="btn-primary text-sm flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Union
                      </button>
                    </div>

                    {/* Unions List */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-white/10">
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Local / Union
                            </th>
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Trade
                            </th>
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Hours & Rates
                            </th>
                            <th className="pb-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Rules & Requirements
                            </th>
                            <th className="pb-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {Array.isArray(unions) && unions.map((union) => (
                            <tr key={union.id} className="group hover:bg-white/5 transition-colors">
                              <td className="py-4 pr-4">
                                <div>
                                  <div className="font-medium text-white">
                                    Local {union.local_number}
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1">{union.name}</div>
                                </div>
                              </td>
                              <td className="py-4 pr-4">
                                <span className="badge-info">
                                  {union.trade}
                                </span>
                              </td>
                              <td className="py-4 pr-4">
                                <div className="text-white font-medium">
                                  {union.regular_hours_start} - {union.regular_hours_end}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {union.regular_rate ? `$${union.regular_rate}/hr` : 'No rate set'} | 
                                  OT: {union.overtime_threshold}h | 
                                  DT: {union.doubletime_threshold}h
                                </div>
                              </td>
                              <td className="py-4 pr-4">
                                <div className="flex gap-2">
                                  {(union.schedule_count || 0) > 0 && (
                                    <span className="badge-success">
                                      {union.schedule_count} Schedule Rules
                                    </span>
                                  )}
                                  {(union.equipment_requirement_count || 0) > 0 && (
                                    <span className="badge-warning">
                                      {union.equipment_requirement_count} Equipment Rules
                                    </span>
                                  )}
                                  {(union.venue_rule_count || 0) > 0 && (
                                    <span className="badge-info">
                                      {union.venue_rule_count} Venue Rules
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditingUnion(union)}
                                    className="icon-btn"
                                  >
                                    <Edit2 className="w-4 h-4 text-primary-400" />
                                  </button>
                                  <button
                                    onClick={() => deleteUnion(union.id)}
                                    className="icon-btn"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(!Array.isArray(unions) || unions.length === 0) && (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">No unions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Room Edit Modal */}
        {editingRoom && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass-card-dark max-w-md w-full p-8 animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-white flex items-center">
                  <Building2 className="w-6 h-6 mr-3 text-primary-400" />
                  {editingRoom.id ? 'Edit Room' : 'Add Room'}
                </h3>
                <button
                  onClick={() => setEditingRoom(null)}
                  className="icon-btn"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                saveRoom(editingRoom);
              }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={editingRoom.capacity || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setEditingRoom({ ...editingRoom, capacity: null });
                      } else {
                        const numValue = parseInt(value);
                        setEditingRoom({ ...editingRoom, capacity: isNaN(numValue) ? null : numValue });
                      }
                    }}
                    className="input-field"
                    min="1"
                    placeholder="Enter room capacity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    value={editingRoom.dimensions}
                    onChange={(e) => setEditingRoom({ ...editingRoom, dimensions: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 50x80 feet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Built-in AV Equipment
                  </label>
                  <textarea
                    value={editingRoom.built_in_av}
                    onChange={(e) => setEditingRoom({ ...editingRoom, built_in_av: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="e.g., Built-in sound system, projection screens"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Additional Features
                  </label>
                  <textarea
                    value={editingRoom.features}
                    onChange={(e) => setEditingRoom({ ...editingRoom, features: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="e.g., Stage, dance floor, crystal chandeliers"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn-primary flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRoom(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Union Edit/Add Dialog */}
        {editingUnion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 animate-fade-in">
            <div className="relative top-20 mx-auto p-5 max-w-4xl animate-scale-in">
              <div className="glass-card-dark p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-white flex items-center">
                    <Users className="w-6 h-6 mr-3 text-primary-400" />
                    {editingUnion.id ? 'Edit Union' : 'Add Union'}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingUnion(null);
                      setHasUnsavedChanges(false);
                    }}
                    className="icon-btn"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-primary-300 flex items-center">
                      <Wrench className="w-4 h-4 mr-2" />
                      Basic Information
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Local Number *
                      </label>
                      <input
                        type="text"
                        value={editingUnion.local_number || ''}
                        onChange={(e) => setEditingUnion({
                          ...editingUnion,
                          local_number: e.target.value
                        })}
                        className="input-field"
                        placeholder="e.g., 134"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Union Name *
                      </label>
                      <input
                        type="text"
                        value={editingUnion.name || ''}
                        onChange={(e) => setEditingUnion({
                          ...editingUnion,
                          name: e.target.value
                        })}
                        className="input-field"
                        placeholder="e.g., Electricians"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trade *
                      </label>
                      <input
                        type="text"
                        value={editingUnion.trade || ''}
                        onChange={(e) => setEditingUnion({
                          ...editingUnion,
                          trade: e.target.value
                        })}
                        className="input-field"
                        placeholder="e.g., Electricians"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Regular Hours Start
                        </label>
                        <input
                          type="time"
                          value={editingUnion.regular_hours_start || '08:00'}
                          onChange={(e) => setEditingUnion({
                            ...editingUnion,
                            regular_hours_start: e.target.value
                          })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Regular Hours End
                        </label>
                        <input
                          type="time"
                          value={editingUnion.regular_hours_end || '17:00'}
                          onChange={(e) => setEditingUnion({
                            ...editingUnion,
                            regular_hours_end: e.target.value
                          })}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rates and Thresholds */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-accent-300 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Rates & Thresholds
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Regular Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editingUnion.regular_rate || ''}
                            onChange={(e) => setEditingUnion({
                              ...editingUnion,
                              regular_rate: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            className="input-field pl-8"
                            placeholder="45.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Overtime Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editingUnion.overtime_rate || ''}
                            onChange={(e) => setEditingUnion({
                              ...editingUnion,
                              overtime_rate: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            className="input-field pl-8"
                            placeholder="67.50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Doubletime Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editingUnion.doubletime_rate || ''}
                            onChange={(e) => setEditingUnion({
                              ...editingUnion,
                              doubletime_rate: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            className="input-field pl-8"
                            placeholder="90.00"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Overtime After (hours)
                        </label>
                        <input
                          type="number"
                          value={editingUnion.overtime_threshold || 8}
                          onChange={(e) => setEditingUnion({
                            ...editingUnion,
                            overtime_threshold: parseInt(e.target.value) || 8
                          })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Doubletime After (hours)
                        </label>
                        <input
                          type="number"
                          value={editingUnion.doubletime_threshold || 12}
                          onChange={(e) => setEditingUnion({
                            ...editingUnion,
                            doubletime_threshold: parseInt(e.target.value) || 12
                          })}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Rules */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-electric-400 flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Special Rules & Requirements
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Weekend Rules
                      </label>
                      <textarea
                        value={editingUnion.weekend_rules || ''}
                        onChange={(e) => setEditingUnion({
                          ...editingUnion,
                          weekend_rules: e.target.value
                        })}
                        className="input-field"
                        rows={3}
                        placeholder="e.g., Saturday past 5PM is doubletime, Sunday is overtime all day"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Holiday Rules
                      </label>
                      <textarea
                        value={editingUnion.holiday_rules || ''}
                        onChange={(e) => setEditingUnion({
                          ...editingUnion,
                          holiday_rules: e.target.value
                        })}
                        className="input-field"
                        rows={3}
                        placeholder="e.g., Doubletime on federal holidays, No work on Christmas"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contact Information
                    </label>
                    <input
                      type="text"
                      value={editingUnion.contact_info || ''}
                      onChange={(e) => setEditingUnion({
                        ...editingUnion,
                        contact_info: e.target.value
                      })}
                      className="input-field"
                      placeholder="Phone, email, or contact person"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={editingUnion.notes || ''}
                      onChange={(e) => setEditingUnion({
                        ...editingUnion,
                        notes: e.target.value
                      })}
                      className="input-field"
                      rows={3}
                      placeholder="e.g., Encore Technicians can set 3 ICW rooms without Projectionists, anything over that requires Projectionists"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditingUnion(null);
                      setHasUnsavedChanges(false);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveUnion(editingUnion)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Union
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Edit Modal */}
        {editingInventory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass-card-dark max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-white flex items-center">
                  <Package className="w-6 h-6 mr-3 text-primary-400" />
                  {editingInventory.id ? 'Edit Inventory Item' : 'Add Inventory Item'}
                </h3>
                <button
                  onClick={() => setEditingInventory(null)}
                  className="icon-btn"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                saveInventoryItem(editingInventory);
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={editingInventory.name}
                      onChange={(e) => setEditingInventory({ ...editingInventory, name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Asset Tag
                    </label>
                    <input
                      type="text"
                      value={editingInventory.asset_tag}
                      onChange={(e) => setEditingInventory({ ...editingInventory, asset_tag: e.target.value })}
                      className="input-field"
                      placeholder="e.g., CG10141484"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingInventory.description}
                    onChange={(e) => setEditingInventory({ ...editingInventory, description: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Detailed description of the item"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={editingInventory.category}
                      onChange={(e) => setEditingInventory({ ...editingInventory, category: e.target.value })}
                      className="select-field"
                      required
                    >
                      <option value="">Select a category</option>
                      <option value="Audio">Audio</option>
                      <option value="Video">Video</option>
                      <option value="Lighting">Lighting</option>
                      <option value="Staging">Staging</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sub Category
                    </label>
                    <input
                      type="text"
                      value={editingInventory.sub_category}
                      onChange={(e) => setEditingInventory({ ...editingInventory, sub_category: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Video Projector, Microphone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quantity Available *
                    </label>
                    <input
                      type="number"
                      value={editingInventory.quantity_available}
                      onChange={(e) => setEditingInventory({ ...editingInventory, quantity_available: parseInt(e.target.value) || 0 })}
                      className="input-field"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status *
                    </label>
                    <select
                      value={editingInventory.status}
                      onChange={(e) => setEditingInventory({ ...editingInventory, status: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="available">Available</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="damaged">Damaged</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={editingInventory.manufacturer}
                      onChange={(e) => setEditingInventory({ ...editingInventory, manufacturer: e.target.value })}
                      className="input-field"
                      placeholder="e.g., NEC, Panasonic"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    value={editingInventory.model}
                    onChange={(e) => setEditingInventory({ ...editingInventory, model: e.target.value })}
                    className="input-field"
                    placeholder="e.g., NP-ME372W"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Condition Notes
                  </label>
                  <textarea
                    value={editingInventory.condition_notes}
                    onChange={(e) => setEditingInventory({ ...editingInventory, condition_notes: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Any notes about the condition or history of this item"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn-primary flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Save Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingInventory(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 