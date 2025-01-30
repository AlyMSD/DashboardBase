'use client'
import React, { useState, useEffect } from 'react';
import { PlusCircle, ArrowLeft, LayoutDashboard, Table } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TYPE_CONFIG = {
  CNF: { products: ['SCP', 'VDU', '5GC', 'IMS'], label: 'Cloud Native Function' },
  VNF: { products: ['vFirewall', 'vRouter', 'vEPC', 'vDNS'], label: 'Virtual Network Function' },
  PNF: { products: ['Physical Router', 'Physical Switch'], label: 'Physical Network Function', customProduct: true }
};

const generateRandomPercentage = () => Math.floor(Math.random() * 100);

const generateDefaultAutomations = () => {
  return Array.from({ length: 5 }, (_, i) => ({
    id: Date.now().toString() + i,
    name: `Automation ${i + 1}`,
    urls: Array.from({ length: 3 }, (_, j) => ({
      name: `URL ${j + 1}`,
      url: `https://auto-generated.com/${i}-${j}`,
      percentage: generateRandomPercentage()
    }))
  }));
};

const CircularProgress = ({ percentage, size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#eee" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#8884d8" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="absolute text-lg font-bold">{percentage.toFixed(0)}%</div>
    </div>
  );
};

const API_URL = '/api/nfs';

const loadNFs = async () => {
  try {
    const res = await fetch(API_URL);
    return await res.json();
  } catch (error) {
    console.error('Error loading NFs:', error);
    return [];
  }
};

const saveNFs = async (nfs) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nfs),
    });
  } catch (error) {
    console.error('Error saving NFs:', error);
  }
};

const Sidebar = ({ activeView, setActiveView }) => (
  <div className="w-64 fixed left-0 top-0 h-screen bg-white border-r p-4">
    <div className="flex items-center gap-2 mb-8">
      <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Verizon_2024.svg" alt="Logo" className="h-100 w-50" />
    </div>
    <nav className="space-y-2">
      <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center gap-2 p-2 rounded ${activeView === 'dashboard' ? 'bg-gray-100' : ''}`}>
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </button>
      <button onClick={() => setActiveView('products')} className={`w-full flex items-center gap-2 p-2 rounded ${activeView === 'products' ? 'bg-gray-100' : ''}`}>
        <Table className="h-4 w-4" /> Products Table
      </button>
    </nav>
  </div>
);

const ProductsTable = () => {
  const [products, setProducts] = useState([]);
  const headers = ['Product', 'Info 1', 'Info 2', 'Info 3', 'Info 4', 'Info 5', 'Info 6', 'Info 7', 'Info 8'];

  useEffect(() => {
    fetch('/products.json')
      .then(res => res.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>{headers.map((header, i) => <th key={i} className="px-4 py-2 text-left text-sm font-medium text-gray-700">{header}</th>)}</tr>
        </thead>
        <tbody>
          {products.map((product, i) => (
            <tr key={i} className="border-b even:bg-gray-50">
              <td className="px-4 py-2 text-sm">{product.name}</td>
              {Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-2 text-sm">{product[`info${j+1}`] || '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const NFCard = ({ nf, onViewDetails, onEdit, onDelete }) => {
  const average = ((nf.automations || []).reduce((acc, automation) => {
    const urls = automation.urls || [];
    const sum = urls.reduce((total, url) => total + (url?.percentage || 0), 0);
    return acc + (urls.length ? sum / urls.length : 0);
  }, 0) / Math.max(nf.automations?.length || 1, 1)) || 0;

  return (
    <Card className="w-full p-2">
      <CardHeader className="p-2">
        <CardTitle className="text-lg">{nf.type} - {nf.product}</CardTitle>
        <CardDescription className="text-sm">VAST ID: {nf.vastId || 'N/A'}</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <div className="h-24 flex items-center justify-center">
          <CircularProgress percentage={average} size={70} />
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-2">
        <Button variant="outline" className="flex-1 text-sm h-8" onClick={() => onViewDetails(nf.id)}>View</Button>
        <Button variant="outline" className="h-8" onClick={() => onEdit(nf)}>Edit</Button>
        <Button variant="destructive" className="h-8" onClick={() => onDelete(nf.id)}>Delete</Button>
      </CardFooter>
    </Card>
  );
};

const NFDialog = ({ initialData, onSave, onOpenChange }) => {
  const [type, setType] = useState(initialData?.type || '');
  const [product, setProduct] = useState(initialData?.product || '');
  const [customProduct, setCustomProduct] = useState('');
  const [vastId, setVastId] = useState(initialData?.vastId || '');

  const getAvailableProducts = () => type ? TYPE_CONFIG[type]?.products || [] : [];
  
  const handleProductChange = (value) => {
    setProduct(value === '__CUSTOM__' ? '' : value);
  };

  const handleSubmit = () => {
    const finalProduct = product === '__CUSTOM__' ? customProduct : product;
    if (!type || !finalProduct) return;
    
    const newNF = {
      ...(initialData && { id: initialData.id }),
      type,
      product: finalProduct,
      vastId,
      automations: initialData?.automations || generateDefaultAutomations() // Auto-generate here
    };
    
    onSave(newNF);
    onOpenChange(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit NF' : 'Add New NF'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label>Type</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([typeKey, config]) => (
                <SelectItem key={typeKey} value={typeKey}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type && (
          <div className="space-y-2">
            <label>Product</label>
            <Select value={product} onValueChange={handleProductChange}>
              <SelectTrigger><SelectValue placeholder={`Select ${TYPE_CONFIG[type].label} product`} /></SelectTrigger>
              <SelectContent>
                {getAvailableProducts().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                {TYPE_CONFIG[type].customProduct && <SelectItem value="__CUSTOM__">Custom Product</SelectItem>}
              </SelectContent>
            </Select>
            {product === '__CUSTOM__' && (
              <Input placeholder="Enter custom product name" value={customProduct} onChange={(e) => setCustomProduct(e.target.value)} />
            )}
          </div>
        )}

        <div className="space-y-2">
          <label>VAST ID (Optional)</label>
          <Input placeholder="Enter VAST ID" value={vastId} onChange={(e) => setVastId(e.target.value)} />
        </div>
        
        <Button className="w-full" onClick={handleSubmit} disabled={!type || !product}>
          {initialData ? 'Save Changes' : 'Add NF'}
        </Button>
      </div>
    </DialogContent>
  );
};

const AutomationDialog = ({ initialData, onSave, onOpenChange }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [urls, setUrls] = useState(initialData?.urls || []);

  const handleAddUrl = () => {
    if (urls.length < 10) {
      setUrls([...urls, {
        name: '',
        url: '',
        percentage: generateRandomPercentage() // Auto-generate on add
      }]);
    }
  };

  const handleUrlChange = (index, field, value) => {
    const newUrls = [...urls];
    newUrls[index][field] = value;
    setUrls(newUrls);
  };

  const handleSubmit = () => {
    onSave({
      ...(initialData && { id: initialData.id }),
      name,
      urls: urls.map(url => ({
        name: url.name,
        url: url.url,
        percentage: url.percentage // Use existing percentage, don't allow editing
      }))
    });
    onOpenChange(false);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit Automation' : 'Add New Automation'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label>Name</label>
          <Input 
            placeholder="Enter automation name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label>URLs (up to 10)</label>
          {urls.map((url, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder="URL Name"
                value={url.name}
                onChange={(e) => handleUrlChange(index, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="URL"
                value={url.url}
                onChange={(e) => handleUrlChange(index, 'url', e.target.value)}
                className="flex-1"
              />
              <div className="w-20 px-2 text-sm text-gray-500">
                {url.percentage}%
              </div>
            </div>
          ))}
          {urls.length < 10 && (
            <Button variant="outline" onClick={handleAddUrl}>
              Add URL
            </Button>
          )}
        </div>
        
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={!name || urls.some(url => !url.name || !url.url)}
        >
          {initialData ? 'Save Changes' : 'Add Automation'}
        </Button>
      </div>
    </DialogContent>
  );
};

const AutomationCard = ({ automation, onEdit, onDelete }) => {
  const average = automation.urls.reduce((sum, url) => sum + (url.percentage || 0), 0) / automation.urls.length;

  return (
    <Card className="w-full p-2">
      <CardHeader className="p-2">
        <CardTitle className="text-lg">{automation.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="h-32 flex items-center justify-center">
          <CircularProgress percentage={average} size={70} />
        </div>
        <div className="mt-2">
          <h4 className="font-semibold text-sm mb-1">URLs:</h4>
          <ul className="space-y-1">
            {automation.urls.map((url, i) => (
              <li key={i} className="flex justify-between items-center text-sm">
                <a href={url.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  {url.name}
                </a>
                <span className="ml-2">{url.percentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="space-x-2 p-2">
        <Button variant="outline" className="h-8" onClick={() => onEdit(automation)}>Edit</Button>
        <Button variant="destructive" className="h-8" onClick={() => onDelete(automation.id)}>Delete</Button>
      </CardFooter>
    </Card>
  );
};

const NFDetailsPage = ({ nf, onBack, onUpdateNF }) => {
  const [editAutomation, setEditAutomation] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleAddAutomation = (newAutomation) => {
    const updatedNF = {
      ...nf,
      automations: [...nf.automations, { ...newAutomation, id: Date.now().toString() }]
    };
    onUpdateNF(updatedNF);
  };

  const handleEditAutomation = (editedAutomation) => {
    const updatedNF = {
      ...nf,
      automations: nf.automations.map(a => a.id === editedAutomation.id ? editedAutomation : a)
    };
    onUpdateNF(updatedNF);
    setEditAutomation(null);
  };

  const handleDeleteAutomation = (automationId) => {
    const updatedNF = {
      ...nf,
      automations: nf.automations.filter(a => a.id !== automationId)
    };
    onUpdateNF(updatedNF);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold">{nf.type} - {nf.product}</h1>
      </div>
      
      <div className="flex gap-4">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-6">
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Automation
            </Button>
          </DialogTrigger>
          <AutomationDialog 
            onSave={handleAddAutomation}
            onOpenChange={setAddDialogOpen}
          />
        </Dialog>

        {editAutomation && (
          <Dialog
            open={!!editAutomation}
            onOpenChange={(open) => !open && setEditAutomation(null)}
          >
            <AutomationDialog 
              initialData={editAutomation}
              onSave={handleEditAutomation}
              onOpenChange={(open) => !open && setEditAutomation(null)}
            />
          </Dialog>
        )}
      </div>


      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {nf.automations.map(automation => (
          <AutomationCard key={automation.id} automation={automation} 
            onEdit={setEditAutomation} onDelete={handleDeleteAutomation} />
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [nfs, setNfs] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedNFId, setSelectedNFId] = useState(null);
  const [editNF, setEditNF] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const initializeNFs = async () => {
      try {
        const loadedNFs = await loadNFs();
        setNfs(Array.isArray(loadedNFs) ? loadedNFs : []);
      } catch (error) {
        console.error('Initialization error:', error);
        setNfs([]);
      }
    };
    initializeNFs();
  }, []);

  const persistNFs = async (newNFs) => {
    try {
      const dataToSend = Array.isArray(newNFs) ? newNFs : [newNFs];
      await saveNFs(dataToSend);
      setNfs(dataToSend);
    } catch (error) {
      console.error('Persist error:', error);
    }
  };

  const selectedNF = nfs.find(m => m.id === selectedNFId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="ml-64 p-6">
        {selectedNF ? (
          <NFDetailsPage 
            nf={selectedNF}
            onBack={() => setSelectedNFId(null)}
            onUpdateNF={(updatedNF) => {
              const updatedNFs = nfs.map(nf => nf.id === updatedNF.id ? updatedNF : nf);
              persistNFs(updatedNFs);
            }}
          />
        ) : activeView === 'dashboard' ? (
          <>
            <div className="mb-6 space-y-4">
              <h1 className="text-2xl font-bold">NAAVI Dashboard</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Add NF
                  </Button>
                </DialogTrigger>
                <NFDialog 
                  onSave={(nf) => persistNFs([...nfs, { ...nf, id: Date.now().toString() }])}
                  onOpenChange={setIsDialogOpen}
                />
              </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {nfs.map((nf, index) => (
                <NFCard 
                  key={nf.id || index}
                  nf={nf}
                  onViewDetails={setSelectedNFId}
                  onEdit={setEditNF}
                  onDelete={(id) => persistNFs(nfs.filter(m => m.id !== id))}
                />
              ))}
            </div>
          </>
        ) : (
          <ProductsTable />
        )}
      </main>
    </div>
  );
};

export default App;