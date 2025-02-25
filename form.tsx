'use client';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload } from 'lucide-react';

export default function FormPage() {
  const [selectedForm, setSelectedForm] = useState('');
  const [formData, setFormData] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Available forms
  const forms = ['Add NF'];

  // Sample form definitions (these would come from your backend)
  const formDefinitions = {
    'Add NF': {
      title: 'Add NF Automation',
      description: 'Add all automations related to an NF.',
      questions: [
        {
            id: 'nf-name',
            type: 'dropdown',
            label: 'NF Name',
            options: ['SCP', 'VDU', 'Uh', 'idk', 'what', 'other', 'Nfs'],
            required: true
          },
        {
          id: 'email',
          type: 'text',
          label: 'Email Address',
          placeholder: 'Enter your email address',
          required: true
        },
        {
          id: 'description',
          type: 'textarea',
          label: 'Description',
          placeholder: 'Please describe the automations in detail...',
          required: true
        },
        {
          id: 'MOP',
          type: 'file',
          label: 'MOP',
          allowedTypes: ['application/pdf'],
          required: true
        }
      ]
    }
    
  };

  // Handle form selection
  const handleFormSelect = (formName) => {
    setSelectedForm(formName);
    setFormData({});
    setFileUploads({});
    setSubmitted(false);
  };

  // Handle input change
  const handleInputChange = (questionId, value) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = (questionId, files) => {
    if (files && files.length > 0) {
      setFileUploads(prev => ({
        ...prev,
        [questionId]: files[0]
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Form data submitted:', formData);
      console.log('File uploads:', fileUploads);
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  // Render individual form field based on type
  const renderFormField = (question) => {
    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </Label>
            <Input 
              id={question.id}
              placeholder={question.placeholder || ''}
              value={formData[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              required={question.required}
            />
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea 
              id={question.id}
              placeholder={question.placeholder || ''}
              value={formData[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              required={question.required}
              className="min-h-32"
            />
          </div>
        );
      
      case 'dropdown':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={formData[question.id] || ''} 
              onValueChange={(value) => handleInputChange(question.id, value)}
              required={question.required}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2 py-4" key={question.id}>
            <Checkbox 
              id={question.id} 
              checked={formData[question.id] || false}
              onCheckedChange={(checked) => handleInputChange(question.id, checked)}
            />
            <Label htmlFor={question.id}>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </Label>
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2" key={question.id}>
            <div>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </div>
            <RadioGroup 
              value={formData[question.id] || ''} 
              onValueChange={(value) => handleInputChange(question.id, value)}
              required={question.required}
            >
              {question.options.map((option) => (
                <div className="flex items-center space-x-2" key={option}>
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </Label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => document.getElementById(question.id).click()}
            >
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <div className="text-sm text-gray-600">
                  {fileUploads[question.id] ? 
                    fileUploads[question.id].name : 
                    'Click to upload or drag and drop'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {question.allowedTypes?.map(type => {
                    if (type === 'image/*') return 'Images';
                    if (type === 'application/pdf') return 'PDFs';
                    if (type === 'application/msword') return 'Word docs';
                    return type;
                  }).join(', ')}
                </div>
              </div>
              <input
                id={question.id}
                type="file"
                className="hidden"
                accept={question.allowedTypes?.join(',')}
                onChange={(e) => handleFileUpload(question.id, e.target.files)}
                required={question.required}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex space-x-4">
        <Select onValueChange={handleFormSelect}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Form" />
          </SelectTrigger>
          <SelectContent>
            {forms.map((form) => (
              <SelectItem key={form} value={form}>
                {form}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedForm && (
        <div className="relative border border-dashed border-gray-300 rounded-lg">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{formDefinitions[selectedForm].title}</CardTitle>
              <div className="text-gray-500 mt-1">{formDefinitions[selectedForm].description}</div>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="py-8 text-center">
                  <div className="text-green-500 text-2xl font-semibold mb-2">Form Submitted Successfully!</div>
                  <p className="text-gray-600">Thank you for your submission.</p>
                  <Button 
                    className="mt-4" 
                    variant="outline" 
                    onClick={() => {
                      setFormData({});
                      setFileUploads({});
                      setSubmitted(false);
                    }}
                  >
                    Submit Another Response
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {formDefinitions[selectedForm].questions.map(renderFormField)}
                  
                  <div className="pt-4">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Form'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
