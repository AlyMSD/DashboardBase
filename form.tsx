'use client';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import { Upload, Trash } from 'lucide-react';

export default function FormPage() {
  // Array of form names (acting as a dictionary with identical keys and values)
  const forms = [
    'Employee Survey',
    'Project Feedback',
    'IT Support Request',
    'Event Registration',
  ];

  const [selectedForm, setSelectedForm] = useState('');
  const [comboboxValue, setComboboxValue] = useState('');
  const [open, setOpen] = useState(false);
  const [loadedFormDefinition, setLoadedFormDefinition] = useState(null);
  const [formData, setFormData] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleFormSelect = async (formName) => {
    setSelectedForm(formName);
    setFormData({});
    setFileUploads({});
    setSubmitted(false);

    try {
      const res = await fetch(`/api/form?name=${encodeURIComponent(formName)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setLoadedFormDefinition(data);
        if (data.answers) setFormData(data.answers);
      }
    } catch (err) {
      console.error('Error loading form', err);
    }
  };

  const handleInputChange = (questionId, value) => {
    setFormData((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleFileUpload = (questionId, files) => {
    if (files?.length) {
      setFileUploads((prev) => ({
        ...prev,
        [questionId]: Array.from(files),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) =>
        payload.append(key, formData[key])
      );
      Object.keys(fileUploads).forEach((key) =>
        fileUploads[key].forEach((file) => payload.append(key, file))
      );

      await fetch(`/api/form?name=${encodeURIComponent(selectedForm)}`, {
        method: 'POST',
        body: payload,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting form', err);
    } finally {
      setSubmitting(false);
    }
  };

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
                // Only allow integer values (empty string allowed)
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

    const groupedQuestions = loadedFormDefinition.questions.reduce(
      (acc, question) => {
        const header = question.header || 'Additional Information';
        if (!acc[header]) acc[header] = [];
        acc[header].push(question);
        return acc;
      },
      {}
    );

    return (
      <form onSubmit={handleSubmit} className="space-y-8">
        {Object.entries(groupedQuestions).map(([header, questions]) => (
          <div key={header} className="space-y-6">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">{header}</h3>
            </div>
            <div className="space-y-4">
              {questions.map((question) => {
                if (question.conditional) {
                  const { questionId, value } = question.conditional;
                  if (formData[questionId] !== value) return null;
                }
                return renderFormField(question);
              })}
            </div>
          </div>
        ))}
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
      {/* Searchable combobox for form selection using the array of form names */}
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

      {selectedForm && loadedFormDefinition && (
        <div className="relative border border-dashed border-gray-300 rounded-lg">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{loadedFormDefinition.title}</CardTitle>
              <div className="text-gray-500 mt-1">
                {loadedFormDefinition.description}
              </div>
            </CardHeader>
            <CardContent>{renderFormContent()}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
