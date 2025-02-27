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
import { Upload, Trash } from 'lucide-react';

export default function FormPage() {
  // Available forms (could also be loaded from your backend)
  const forms = ['Employee Survey', 'Project Feedback', 'IT Support Request', 'Event Registration'];

  const [selectedForm, setSelectedForm] = useState('');
  const [loadedFormDefinition, setLoadedFormDefinition] = useState(null);
  const [formData, setFormData] = useState({});
  const [fileUploads, setFileUploads] = useState({}); // Stores arrays of File objects per question id
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Delete handler for uploaded files
  const handleDeleteFile = (questionId, index, source) => {
    if (source === 'existing') {
      setFormData((prev) => {
        const currentFiles = prev[questionId] || [];
        const updatedFiles = [...currentFiles];
        updatedFiles.splice(index, 1);
        return { ...prev, [questionId]: updatedFiles };
      });
    } else if (source === 'new') {
      setFileUploads((prev) => {
        const currentFiles = prev[questionId] || [];
        const updatedFiles = [...currentFiles];
        updatedFiles.splice(index, 1);
        return { ...prev, [questionId]: updatedFiles };
      });
    }
  };

  // Called when a form is selected; fetch the form definition and any existing responses.
  const handleFormSelect = async (formName) => {
    setSelectedForm(formName);
    setFormData({});
    setFileUploads({});
    setSubmitted(false);

    try {
      const res = await fetch(`/api/form?name=${encodeURIComponent(formName)}`);
      if (!res.ok) {
        console.error('Failed to fetch form. Status:', res.status);
        return;
      }
      const data = await res.json();
      console.log("Fetched form data:", data); // Debugging
      if (data) {
        setLoadedFormDefinition(data);
        // Prefill the form if there are saved answers under "answers"
        if (data.answers) {
          setFormData(data.answers);
        }
      }
    } catch (err) {
      console.error('Error loading form', err);
    }
  };

  // Handle input changes for text, textarea, radio, dropdown etc.
  const handleInputChange = (questionId, value) => {
    setFormData((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Handle file uploads (supporting multiple files per field)
  const handleFileUpload = (questionId, files) => {
    if (files && files.length > 0) {
      // Store an array of File objects
      setFileUploads((prev) => ({
        ...prev,
        [questionId]: Array.from(files),
      }));
    }
  };

  // Handle form submission: send form data and file uploads to the backend.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Use FormData to mix JSON fields and files.
      const payload = new FormData();
      // Append all non-file fields.
      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key]);
      });
      
      // Append file uploads (each question id key may have multiple files)
      Object.keys(fileUploads).forEach((key) => {
        fileUploads[key].forEach((file) => {
          payload.append(key, file);
        });
      });

      const res = await fetch(`/api/form?name=${encodeURIComponent(selectedForm)}`, {
        method: 'POST',
        body: payload,
      });
      const result = await res.json();
      console.log('Response:', result);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting form', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Render individual form fields based on the question type.
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
            {/* If the selected radio option is "Other", display a text input for custom value */}
            {formData[question.id] === 'Other' && (
              <div className="mt-2">
                <Input
                  id={`${question.id}_other`}
                  placeholder="Please specify"
                  value={formData[`${question.id}_other`] || ''}
                  onChange={(e) => handleInputChange(`${question.id}_other`, e.target.value)}
                  required={question.required}
                />
              </div>
            )}
          </div>
        );
      
      case 'file': {
        // Combine previously uploaded files (from formData) and new uploads (from fileUploads)
        const existingFiles = formData[question.id] || [];
        const newFiles = fileUploads[question.id] || [];
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label} {question.required && <span className="text-red-500">*</span>}
            </Label>

            {/* List uploaded files with delete icons */}
            {(existingFiles.length > 0 || newFiles.length > 0) && (
              <div className="mb-2">
                <ul>
                  {existingFiles.map((filePath, index) => {
                    const fileName = filePath.split('/').pop();
                    return (
                      <li key={`existing-${index}`} className="flex items-center justify-between text-sm">
                        <span>{fileName}</span>
                        <Trash
                          className="h-4 w-4 text-red-500 cursor-pointer"
                          onClick={() => handleDeleteFile(question.id, index, 'existing')}
                        />
                      </li>
                    );
                  })}
                  {newFiles.map((file, index) => (
                    <li key={`new-${index}`} className="flex items-center justify-between text-sm">
                      <span>{file.name}</span>
                      <Trash
                        className="h-4 w-4 text-red-500 cursor-pointer"
                        onClick={() => handleDeleteFile(question.id, index, 'new')}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className="border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => document.getElementById(question.id).click()}
            >
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <div className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {question.allowedTypes?.map((type) => {
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
                multiple
                accept={question.allowedTypes?.join(',')}
                onChange={(e) => handleFileUpload(question.id, e.target.files)}
                required={question.required}
              />
            </div>
          </div>
        );
      }

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

      {selectedForm && loadedFormDefinition && (
        <div className="relative border border-dashed border-gray-300 rounded-lg">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{loadedFormDefinition.title}</CardTitle>
              <div className="text-gray-500 mt-1">{loadedFormDefinition.description}</div>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="py-8 text-center">
                  <div className="text-green-500 text-2xl font-semibold mb-2">
                    Form Submitted Successfully!
                  </div>
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
                  {loadedFormDefinition.questions.map((question) => {
                    // Check for conditional display.
                    if (question.conditional) {
                      const { questionId, value } = question.conditional;
                      if (formData[questionId] !== value) {
                        return null;
                      }
                    }
                    return renderFormField(question);
                  })}
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
