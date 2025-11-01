import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle2 } from "lucide-react";

// Form validation schema
const waitlistFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().min(1, "Company name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  whatsappNumber: z.string().optional(),
  whatsappCountryCode: z.string().optional(),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
  primaryUseCase: z.enum([
    "Managing multiple products",
    "Context switching between tools",
    "Onboarding to new team",
    "Compliance/audit trails",
    "Other",
  ]),
  painLevel: z.enum(["Daily", "Weekly", "Monthly", "Rarely"]),
  agreeToContact: z.boolean().refine((val) => val === true, {
    message: "You must agree to be contacted",
  }),
});

type WaitlistFormValues = z.infer<typeof waitlistFormSchema>;

interface WaitlistFormProps {
  onSuccess?: () => void;
}

export function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      companyName: "",
      jobTitle: "",
      whatsappNumber: "",
      whatsappCountryCode: "+1",
      companySize: undefined,
      primaryUseCase: undefined,
      painLevel: "Daily",
      agreeToContact: false,
    },
  });

  // Common country codes
  const countryCodes = [
    { code: "+1", country: "US/Canada" },
    { code: "+44", country: "UK" },
    { code: "+91", country: "India" },
    { code: "+61", country: "Australia" },
    { code: "+49", country: "Germany" },
    { code: "+33", country: "France" },
    { code: "+81", country: "Japan" },
    { code: "+86", country: "China" },
    { code: "+52", country: "Mexico" },
    { code: "+55", country: "Brazil" },
  ];

  const onSubmit = async (data: WaitlistFormValues) => {
    setIsSubmitting(true);

    try {
      // Extract UTM parameters from URL
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get("utm_source");
      const utmMedium = params.get("utm_medium");
      const utmCampaign = params.get("utm_campaign");

      // Capture user agent
      const userAgent = navigator.userAgent;

      // Prepare data for Supabase
      const signupData = {
        full_name: data.fullName,
        email: data.email,
        company_name: data.companyName,
        job_title: data.jobTitle,
        whatsapp_number: data.whatsappNumber || null,
        whatsapp_country_code: data.whatsappCountryCode || null,
        company_size: data.companySize,
        primary_use_case: data.primaryUseCase,
        pain_level: data.painLevel,
        agree_to_contact: data.agreeToContact,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        user_agent: userAgent,
      };

      // Insert into Supabase
      const { error } = await supabase
        .from("waitlist_signups")
        .insert([signupData]);

      if (error) {
        // Check if it's a duplicate email error
        if (error.code === "23505") {
          toast({
            title: "Already Signed Up",
            description: "This email is already on our waitlist!",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSuccess(true);
      onSuccess?.();

      toast({
        title: "Success!",
        description: "You've been added to our waitlist.",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description:
          "Something went wrong. Please try again or contact support.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Success state UI
  if (isSuccess) {
    return (
      <div className="glass-card rounded-lg p-8 text-center animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
        <p className="text-muted-foreground mb-4">
          An admin will contact you with details. Please wait.
        </p>
        <p className="text-sm text-muted-foreground">
          We're excited to have you join the Haven7 community.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title / Position</FormLabel>
              <FormControl>
                <Input
                  placeholder="Product Manager"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <FormField
            control={form.control}
            name="whatsappCountryCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country Code</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map(({ code, country }) => (
                        <SelectItem key={code} value={code}>
                          {code} {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatsappNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1234567890"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="companySize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Size</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-1000">201-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryUseCase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Use Case</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary use case" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Managing multiple products">
                    Managing multiple products
                  </SelectItem>
                  <SelectItem value="Context switching between tools">
                    Context switching between tools
                  </SelectItem>
                  <SelectItem value="Onboarding to new team">
                    Onboarding to new team
                  </SelectItem>
                  <SelectItem value="Compliance/audit trails">
                    Compliance/audit trails
                  </SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="painLevel"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>How often do you struggle to find information?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                  disabled={isSubmitting}
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Daily" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Daily
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Weekly" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Weekly
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Monthly" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Monthly
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Rarely" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Rarely
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="agreeToContact"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  I agree to be contacted for product updates and beta access
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Join Early Access"
          )}
        </Button>
      </form>
    </Form>
  );
}

