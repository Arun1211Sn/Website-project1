export interface Service {
  id: string;
  icon: string;
  tag: string;
  title: string;
  description: string;
  features: string[];
  color: string;
  bgColor: string;
  tagColor: string;
  tagBg: string;
  ctaColor: string;
}

export interface FormData {
  name: string;
  phone: string;
  service: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof FormData, string>>;
}
