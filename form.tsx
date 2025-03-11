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
    'User Info'
  ];

  // State for form selection and version handling.
  const [selectedForm, setSelectedForm] = useState('');
  const [comboboxValue, setComboboxValue] = useState('');
  const [open, setOpen] = useState(false);
  const [loadedFormDefinition, setLoadedFormDefinition] = useState(null);
  const [formData, setFormData] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Version states: selectedVersion is used both for editing and for selecting an existing version.
  const [selectedVersion, setSelectedVersion] = useState('');
  const [availableVersions, setAvailableVersions] = useState([]);

  // Flag to indicate a clone (new version) action.
  const [isCloning, setIsCloning] = useState(false);

  // Use a key that includes both form and version.
  const LOCAL_STORAGE_KEY = (formName, version) =>
    `form_${formName}_v_${version}_submission`;

  // Delete file from either existing answer array or new uploads.
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

  // Fetch form definition for a given form and version.
  const fetchFormDefinition = async (formName, version = '') => {
    try {
      let url = `http://127.0.0.1:5000/api/form?name=${encodeURIComponent(formName)}`;
      if (version) url += `&version=${encodeURIComponent(version)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setLoadedFormDefinition(data);
        // Set available versions if the backend sends an array.
        if (data.versions && Array.isArray(data.versions)) {
          setAvailableVersions(data.versions);
        } else {
          setAvailableVersions([data.version_name]);
        }
        // Set selected version to the fetched version if not cloning.
        if (!isCloning) setSelectedVersion(data.version_name);

        // Build initial formData from DB data.
        const initialFormData = {};
        data.sections.forEach((section) => {
          section.questions.forEach((question) => {
            if (question.type === 'file') {
              initialFormData[question.id] = question.answer || [];
            } else {
              initialFormData[question.id] =
                question.answer !== null && question.answer !== undefined
                  ? question.answer
                  : '';
            }
          });
        });
        // If a previous submission exists (based on form and version), load it.
        const savedSubmission = localStorage.getItem(
          LOCAL_STORAGE_KEY(formName, version || data.version_name)
        );
        if (savedSubmission) {
          const parsed = JSON.parse(savedSubmission);
          Object.keys(parsed).forEach((key) => {
            initialFormData[key] = parsed[key];
          });
        }
        setFormData(initialFormData);
      }
    } catch (err) {
      console.error('Error loading form', err);
    }
  };

  // When a user selects a form from the list.
  const handleFormSelect = async (formName) => {
    setSelectedForm(formName);
    setFormData({});
    setFileUploads({});
    setSubmitted(false);
    setCurrentSection(0);
    setIsCloning(false);
    // Clear version-related states.
    setSelectedVersion('');
    setAvailableVersions([]);
    await fetchFormDefinition(formName);
  };

  // Handle version selection from the versions combo box.
  const handleVersionSelect = async (version) => {
    // When selecting an existing version, we reset the cloning flag.
    setIsCloning(false);
    setSelectedVersion(version);
    setFormData({});
    setFileUploads({});
    setSubmitted(false);
    setCurrentSection(0);
    await fetchFormDefinition(selectedForm, version);
  };

  // Handle input change for form fields.
  const handleInputChange = (questionId, value) => {
    setFormData((prev) => ({ ...prev, [questionId]: value }));
  };

  // Append newly uploaded files.
  const handleFileUpload = (questionId, files) => {
    if (files?.length) {
      setFileUploads((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), ...Array.from(files)],
      }));
    }
  };

  // On form submission, include the version name.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = new FormData();
      // Append formData fields.
      Object.keys(formData).forEach((key) =>
        payload.append(key, formData[key])
      );
      // Append files.
      Object.keys(fileUploads).forEach((key) => {
        fileUploads[key].forEach((file) => payload.append(key, file));
      });
      // Append the version name.
      payload.append('version_name', selectedVersion);

      await fetch(`http://127.0.0.1:5000/api/form?name=${encodeURIComponent(selectedForm)}`, {
        method: 'POST',
        body: payload,
      });
      setSubmitted(true);
      // Save the submission in local storage based on form and version.
      localStorage.setItem(
        LOCAL_STORAGE_KEY(selectedForm, selectedVersion),
        JSON.stringify(formData)
      );
    } catch (err) {
      console.error('Error submitting form', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Render a field based on its type.
  const renderFormField = (question) => {
    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}{' '}
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
              {question.label}{' '}
              {question.required && <span className="text-red-500">*</span>}
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

      case 'number':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}{' '}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={question.id}
              placeholder={question.placeholder || ''}
              type="number"
              step="1"
              pattern="\d*"
              value={formData[question.id] || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) {
                  handleInputChange(question.id, value);
                }
              }}
              required={question.required}
            />
          </div>
        );

      case 'dropdown':
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}{' '}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="relative">
              <select
                id={question.id}
                className="w-full border rounded p-2"
                value={formData[question.id] || ''}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                required={question.required}
              >
                <option value="" disabled>
                  Select an option
                </option>
                {question.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2" key={question.id}>
            <Label>
              {question.label}{' '}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options.map((option) => {
                const isChecked = (formData[question.id] || []).includes(option);
                return (
                  <div key={option} className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const selected = formData[question.id] || [];
                          let newSelected;
                          if (checked) {
                            newSelected = [...selected, option];
                          } else {
                            newSelected = selected.filter(
                              (item) => item !== option
                            );
                            if (option === 'Other') {
                              handleInputChange(`${question.id}_other`, '');
                            }
                          }
                          handleInputChange(question.id, newSelected);
                        }}
                      />
                      <Label htmlFor={`${question.id}-${option}`}>
                        {option}
                      </Label>
                    </div>
                    {option === 'Other' && isChecked && (
                      <div className="ml-6">
                        <Input
                          placeholder="Please specify"
                          value={formData[`${question.id}_other`] || ''}
                          onChange={(e) =>
                            handleInputChange(
                              `${question.id}_other`,
                              e.target.value
                            )
                          }
                          required={question.required}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2" key={question.id}>
            <div>
              {question.label}{' '}
              {question.required && <span className="text-red-500">*</span>}
            </div>
            <RadioGroup
              value={formData[question.id] || ''}
              onValueChange={(value) => handleInputChange(question.id, value)}
              required={question.required}
            >
              {question.options.map((option) => (
                <div className="flex items-center space-x-2" key={option}>
                  <RadioGroupItem
                    value={option}
                    id={`${question.id}-${option}`}
                  />
                  <Label htmlFor={`${question.id}-${option}`}>
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formData[question.id] === 'Other' && (
              <div className="mt-2">
                <Input
                  id={`${question.id}_other`}
                  placeholder="Please specify"
                  value={formData[`${question.id}_other`] || ''}
                  onChange={(e) =>
                    handleInputChange(`${question.id}_other`, e.target.value)
                  }
                  required={question.required}
                />
              </div>
            )}
          </div>
        );

      case 'file': {
        const existingFiles = formData[question.id] || [];
        const newFiles = fileUploads[question.id] || [];
        return (
          <div className="space-y-2" key={question.id}>
            <Label htmlFor={question.id}>
              {question.label}{' '}
              {question.required && <span className="text-red-500">*</span>}
            </Label>
            {(existingFiles.length > 0 || newFiles.length > 0) && (
              <div className="mb-2">
                <ul>
                  {existingFiles.map((filePath, index) => {
                    const fileName = filePath.split('/').pop();
                    return (
                      <li
                        key={`existing-${index}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{fileName}</span>
                        <Trash
                          className="h-4 w-4 text-red-500 cursor-pointer"
                          onClick={() =>
                            handleDeleteFile(question.id, index, 'existing')
                          }
                        />
                      </li>
                    );
                  })}
                  {newFiles.map((file, index) => (
                    <li
                      key={`new-${index}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{file.name}</span>
                      <Trash
                        className="h-4 w-4 text-red-500 cursor-pointer"
                        onClick={() =>
                          handleDeleteFile(question.id, index, 'new')
                        }
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
                  {question.allowedTypes
                    ?.map((type) => {
                      if (type === 'image/*') return 'Images';
                      if (type === 'application/pdf') return 'PDFs';
                      if (type === 'application/msword') return 'Word docs';
                      return type;
                    })
                    .join(', ')}
                </div>
              </div>
              <input
                id={question.id}
                type="file"
                className="hidden"
                multiple
                accept={question.allowedTypes?.join(',')}
                onChange={(e) =>
                  handleFileUpload(question.id, e.target.files)
                }
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

  // Render the current section (page) with a page tracker.
  const renderSection = () => {
    if (!loadedFormDefinition) return null;
    const sections = loadedFormDefinition.sections;
    const section = sections[currentSection];

    return (
      <>
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Section {currentSection + 1} of {sections.length}
            </div>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentSection((prev) => prev - 1)}
                disabled={currentSection === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentSection((prev) => prev + 1)}
                disabled={currentSection === sections.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-2">
            {section.name}
          </h3>
          {section.description && (
            <p className="text-gray-500">{section.description}</p>
          )}
        </div>
        <div className="space-y-4">
          {section.questions.map((question) => {
            if (question.conditional) {
              const { questionId, value } = question.conditional;
              if (formData[questionId] !== value) return null;
            }
            return renderFormField(question);
          })}
        </div>
      </>
    );
  };

  // Render the form content.
  const renderFormContent = () => {
    if (submitted) {
      return (
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
      );
    }
    return (
      <form onSubmit={handleSubmit} className="space-y-8">
        {renderSection()}
        <div className="pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Form'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Form selection combo box */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {comboboxValue || 'Select Form'}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search form..." className="h-9" />
            <CommandList>
              <CommandEmpty>No form found.</CommandEmpty>
              <CommandGroup>
                {forms.map((form) => (
                  <CommandItem
                    key={form}
                    value={form}
                    onSelect={(currentValue) => {
                      const newValue =
                        currentValue === comboboxValue ? '' : currentValue;
                      setComboboxValue(newValue);
                      setOpen(false);
                      if (newValue) {
                        handleFormSelect(newValue);
                      }
                    }}
                  >
                    {form}
                    <Check
                      className={cn(
                        'ml-auto',
                        comboboxValue === form ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* If a form is selected and loaded, show the form with version options */}
      {selectedForm && loadedFormDefinition && (
        <div className="relative border border-dashed border-gray-300 rounded-lg">
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-col gap-2">
                <CardTitle>{loadedFormDefinition.form_name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Version:</Label>
                  {/* Editable version name input */}
                  <Input
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="w-40"
                  />
                  {/* Clone version button: clears version name to allow for a new clone */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsCloning(true);
                      setSelectedVersion('');
                    }}
                  >
                    Clone Version
                  </Button>
                </div>
                {/* If multiple versions are available, show a version selection combo box */}
                {availableVersions.length > 1 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40 justify-between">
                        {selectedVersion || 'Select Version'}
                        <ChevronsUpDown className="opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search version..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No version found.</CommandEmpty>
                          <CommandGroup>
                            {availableVersions.map((version) => (
                              <CommandItem
                                key={version}
                                value={version}
                                onSelect={(val) => {
                                  handleVersionSelect(val);
                                }}
                              >
                                {version}
                                <Check
                                  className={cn(
                                    'ml-auto',
                                    selectedVersion === version
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <div className="text-gray-500 text-sm">
                  {loadedFormDefinition.version_name}
                </div>
              </div>
            </CardHeader>
            <CardContent>{renderFormContent()}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
