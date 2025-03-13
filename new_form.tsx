'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Upload, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function FormPage() {
  const forms = [
    'Employee Survey',
    'Project Feedback',
    'IT Support Request',
    'Event Registration',
    'User Info',
  ];

  // State management
  const [selectedForm, setSelectedForm] = useState('');
  const [comboboxValue, setComboboxValue] = useState('');
  const [open, setOpen] = useState(false);
  const [loadedFormDefinition, setLoadedFormDefinition] = useState(null);
  const [formData, setFormData] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [availableVersions, setAvailableVersions] = useState([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [versionNameError, setVersionNameError] = useState('');

  // Local storage keys
  const LOCAL_STORAGE_VERSION_KEY = (formName) => `selected_version_${formName}`;
  const LOCAL_STORAGE_SUBMISSION_KEY = (formName, version) =>
    `form_${formName}_v_${version}_submission`;

  // Fetch form definition
  const fetchFormDefinition = async (formName, version = '') => {
    if (!formName) return;
    try {
      let url = `http://127.0.0.1:5000/api/form?name=${encodeURIComponent(formName)}`;
      if (version) url += `&version=${encodeURIComponent(version)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error fetching form: ${res.status}`);
      const data = await res.json();
      setLoadedFormDefinition(data);
      setAvailableVersions(data.versions || [data.version_name]);
      setSelectedVersion(version || data.version_name);
      const initialFormData = {};
      data.sections.forEach((section) => {
        section.questions.forEach((question) => {
          initialFormData[question.id] =
            question.answer !== null && question.answer !== undefined
              ? question.answer
              : question.type === 'checkbox' || question.type === 'file'
              ? []
              : '';
        });
      });
      const savedSubmission = localStorage.getItem(
        LOCAL_STORAGE_SUBMISSION_KEY(formName, version || data.version_name)
      );
      if (savedSubmission) {
        Object.assign(initialFormData, JSON.parse(savedSubmission));
      }
      setFormData(initialFormData);
    } catch (err) {
      console.error('Error loading form', err);
    }
  };

  // Handle form selection
  useEffect(() => {
    if (selectedForm) fetchFormDefinition(selectedForm);
  }, [selectedForm]);

  const handleFormSelect = (formName) => {
    setSelectedForm(formName);
    setComboboxValue(formName);
    setOpen(false);
    setFormData({});
    setFileUploads({});
    setSubmitted(false);
    setCurrentSection(0);
    setSelectedVersion('');
    setAvailableVersions([]);
    setNewVersionName('');
    setVersionNameError('');
  };

  // Handle version selection
  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setNewVersionName('');
    setFormData({});
    setFileUploads({});
    setSubmitted(false);
    setCurrentSection(0);
    fetchFormDefinition(selectedForm, version);
  };

  // Handle input changes
  const handleInputChange = (questionId, value) => {
    setFormData((prev) => ({ ...prev, [questionId]: value }));
  };

  // Handle file uploads
  const handleFileUpload = (questionId, files) => {
    if (files?.length) {
      setFileUploads((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), ...Array.from(files)],
      }));
    }
  };

  // Handle file deletion
  const handleDeleteFile = (questionId, index, source) => {
    if (source === 'existing') {
      setFormData((prev) => {
        const currentFiles = prev[questionId] || [];
        const updatedFiles = currentFiles.filter((_, i) => i !== index);
        return { ...prev, [questionId]: updatedFiles };
      });
    } else if (source === 'new') {
      setFileUploads((prev) => {
        const currentFiles = prev[questionId] || [];
        const updatedFiles = currentFiles.filter((_, i) => i !== index);
        return { ...prev, [questionId]: updatedFiles };
      });
    }
  };

  // Send form data
  const handleFormSend = async (action) => {
    if ((action === 'clone' || action === 'new_version' || action === 'rename') && !newVersionName) {
      setVersionNameError('Please enter a new version name.');
      return;
    }

    setSubmitting(true);
    setVersionNameError('');
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((val) => payload.append(key, val));
        } else {
          payload.append(key, value);
        }
      });
      Object.entries(fileUploads).forEach(([key, files]) => {
        files.forEach((file) => payload.append(key, file));
      });

      payload.append('version_name', selectedVersion);
      if (action === 'clone' || action === 'new_version' || action === 'rename') {
        payload.append('new_version_name', newVersionName);
      }
      payload.append('action', action);

      const res = await fetch(
        `http://127.0.0.1:5000/api/form?name=${encodeURIComponent(selectedForm)}`,
        { method: 'POST', body: payload }
      );

      if (!res.ok) {
        if (res.status === 409) {
          const errorData = await res.json();
          setVersionNameError(errorData.error || 'Version name already exists.');
        }
        throw new Error('Error sending form');
      }

      const data = await res.json();
      setLoadedFormDefinition(data);
      setAvailableVersions(data.versions);
      setSelectedVersion(data.version_name);
      setNewVersionName('');
      if (action === 'submit') {
        setSubmitted(true);
        localStorage.setItem(
          LOCAL_STORAGE_SUBMISSION_KEY(selectedForm, data.version_name),
          JSON.stringify(formData)
        );
      }
      await fetchFormDefinition(selectedForm, data.version_name);
    } catch (err) {
      console.error('Error sending form', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Form field rendering
  const renderFormField = (question) => {
    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
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
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={question.id}
              placeholder={question.placeholder || ''}
              value={formData[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              required={question.required}
            />
          </div>
        );
      case 'number':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={question.id}
              type="number"
              value={formData[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              required={question.required}
            />
          </div>
        );
      case 'dropdown':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <select
              id={question.id}
              className="w-full border rounded p-2"
              value={formData[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              required={question.required}
            >
              <option value="">Select an option</option>
              {question.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2" key={question.id}>
            <Label>
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={(formData[question.id] || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = formData[question.id] || [];
                    const updated = checked
                      ? [...current, option]
                      : current.filter((item) => item !== option);
                    handleInputChange(question.id, updated);
                  }}
                />
                <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2" key={question.id}>
            <Label>
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <RadioGroup
              value={formData[question.id] || ''}
              onValueChange={(value) => handleInputChange(question.id, value)}
              required={question.required}
            >
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      case 'file':
        const existingFiles = formData[question.id] || [];
        const newFiles = fileUploads[question.id] || [];
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            {(existingFiles.length > 0 || newFiles.length > 0) && (
              <ul className="mb-2">
                {existingFiles.map((filePath, index) => (
                  <li key={`existing-${index}`} className="flex justify-between">
                    <span>{filePath.split('/').pop()}</span>
                    <Trash
                      className="h-4 w-4 text-red-500 cursor-pointer"
                      onClick={() => handleDeleteFile(question.id, index, 'existing')}
                    />
                  </li>
                ))}
                {newFiles.map((file, index) => (
                  <li key={`new-${index}`} className="flex justify-between">
                    <span>{file.name}</span>
                    <Trash
                      className="h-4 w-4 text-red-500 cursor-pointer"
                      onClick={() => handleDeleteFile(question.id, index, 'new')}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div
              className="border-2 border-dashed p-4 text-center cursor-pointer"
              onClick={() => document.getElementById(question.id).click()}
            >
              <Upload className="h-6 w-6 mx-auto" />
              <p>Upload files</p>
              <input
                id={question.id}
                type="file"
                multiple={question.multiple}
                accept={question.allowedTypes?.join(',')}
                className="hidden"
                onChange={(e) => handleFileUpload(question.id, e.target.files)}
                required={question.required && existingFiles.length === 0 && newFiles.length === 0}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render section
  const renderSection = () => {
    if (!loadedFormDefinition) return null;
    const section = loadedFormDefinition.sections[currentSection];
    return (
      <>
        <div className="mb-4">
          <div className="flex justify-between">
            <span>Section {currentSection + 1} of {loadedFormDefinition.sections.length}</span>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSection((prev) => prev - 1)}
                disabled={currentSection === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSection((prev) => prev + 1)}
                disabled={currentSection === loadedFormDefinition.sections.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
          <h3 className="text-lg font-semibold">{section.name}</h3>
          {section.description && <p>{section.description}</p>}
        </div>
        <div className="space-y-4">
          {section.questions.map((question) => {
            if (question.conditional) {
              const { questionId, value } = question.conditional;
              const currentAnswer = formData[questionId];
              if (Array.isArray(value)) {
                if (!value.includes(currentAnswer)) return null;
              } else if (currentAnswer !== value) {
                return null;
              }
            }
            return renderFormField(question);
          })}
        </div>
      </>
    );
  };

  // Render form content
  const renderFormContent = () => {
    if (submitted) {
      return (
        <div className="text-center py-8">
          <p className="text-green-500 text-2xl">Form Submitted Successfully!</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setFormData({});
              setFileUploads({});
              setSubmitted(false);
            }}
          >
            Submit Another Response
          </Button>
        </div>
      );
    }
    return (
      <form onSubmit={(e) => { e.preventDefault(); handleFormSend('submit'); }} className="space-y-8">
        {renderSection()}
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => handleFormSend('save')} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Form selection */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            {comboboxValue || 'Select Form'}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search form..." />
            <CommandList>
              <CommandEmpty>No form found.</CommandEmpty>
              <CommandGroup>
                {forms.map((form) => (
                  <CommandItem
                    key={form}
                    value={form}
                    onSelect={handleFormSelect}
                  >
                    {form}
                    <Check className={cn('ml-auto', comboboxValue === form ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Form content */}
      {selectedForm && loadedFormDefinition && (
        <Card>
          <CardHeader>
            <CardTitle>{loadedFormDefinition.form_name}</CardTitle>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label>Current Version:</Label>
                <Input
                  value={selectedVersion}
                  readOnly
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>New Version Name:</Label>
                <Input
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="Enter new version name"
                  className="w-40"
                />
                <Button size="sm" variant="outline" onClick={() => handleFormSend('clone')} disabled={!newVersionName || submitting}>
                  Clone Version
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleFormSend('new_version')} disabled={!newVersionName || submitting}>
                  Create New Version
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleFormSend('rename')} disabled={!newVersionName || submitting}>
                  Rename
                </Button>
              </div>
              {versionNameError && <p className="text-red-500 text-sm">{versionNameError}</p>}
              {availableVersions.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-40 justify-between">
                      {selectedVersion || 'Select Version'}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-0">
                    <Command>
                      <CommandInput placeholder="Search version..." />
                      <CommandList>
                        <CommandEmpty>No version found.</CommandEmpty>
                        <CommandGroup>
                          {availableVersions.map((version) => (
                            <CommandItem
                              key={version}
                              value={version}
                              onSelect={handleVersionSelect}
                            >
                              {version}
                              <Check className={cn('ml-auto', selectedVersion === version ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </CardHeader>
          <CardContent>{renderFormContent()}</CardContent>
        </Card>
      )}
    </div>
  );
}
