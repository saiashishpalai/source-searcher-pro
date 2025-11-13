import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

// Simplified form validation schema - only email
const waitlistFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
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
      email: "",
    },
  });

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

      // Prepare data for Supabase - send empty strings instead of null
      // This works around PostgREST schema cache issues
      const signupData: any = {
        email: data.email,
        full_name: "",
        company_name: "",
        job_title: "",
        company_size: "Unknown",
        primary_use_case: "Unknown",
        pain_level: "Unknown",
        agree_to_contact: true,
        user_agent: userAgent,
      };

      // Only include optional fields if they have values
      if (utmSource) signupData.utm_source = utmSource;
      if (utmMedium) signupData.utm_medium = utmMedium;
      if (utmCampaign) signupData.utm_campaign = utmCampaign;

      // Insert into Supabase
      console.log("Submitting signup data:", signupData);
      const { data: insertResult, error } = await supabase
        .from("waitlist_signups")
        .insert([signupData]);

      if (error) {
        console.error("Supabase error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        
        // Check if it's a duplicate email error
        if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("unique")) {
          toast({
            title: "Already Signed Up",
            description: "This email is already on our waitlist!",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Check if table doesn't exist
        if (error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("relation")) {
          toast({
            title: "Database Error",
            description: "Table not found. Please run CREATE_WAITLIST_TABLE.sql in Supabase SQL Editor.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Check for NOT NULL constraint violation
        if (error.message?.includes("null value") || error.message?.includes("NOT NULL")) {
          toast({
            title: "Database Error",
            description: "Please run CREATE_WAITLIST_TABLE.sql to fix the database schema.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        
        // Show the actual error message
        throw error;
      }
      
      console.log("Success! Data inserted:", insertResult);

      // Success
      setIsSuccess(true);
      onSuccess?.();

      toast({
        title: "Success!",
        description: "You've been added to our waitlist.",
      });
    } catch (error: any) {
      console.error("Error submitting form:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      
      // Extract detailed error message
      let errorMessage = "Something went wrong. Please try again or contact support.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // Success state UI
  if (isSuccess) {
    return (
      <div className="text-center animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-white mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2 text-white">Thank You!</h3>
        <p className="text-white/60 mb-4">
          We've added you to our waitlist. We'll be in touch soon!
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-lg mx-auto">
        <div className="flex flex-col sm:flex-row gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-white/20 focus:ring-white/20 rounded-lg backdrop-blur-sm"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage className="text-rose-400" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="h-14 px-8 bg-white text-black hover:bg-white/90 rounded-lg font-semibold transition-all disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Waitlist
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
