import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { WaitlistForm } from "@/components/WaitlistForm";

const Waitlist = () => {
  return (
    <HeroGeometric
      badge="Waitlist"
      title1="Limited"
      title2="Early Access Spots Available"
      description="Be among the first to experience Haven7's unified workspace for Search, PRD Studio, and Spec Vision."
    >
      <div className="mt-8">
        <WaitlistForm />
      </div>
    </HeroGeometric>
  );
};

export default Waitlist;
