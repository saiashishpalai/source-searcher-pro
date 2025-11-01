import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportToCSV, exportToJSON, WaitlistSignup } from "@/utils/exportWaitlist";
import { Loader2, Download, FileJson, Search, Lock, TrendingUp } from "lucide-react";

const ADMIN_PIN = "9979";

const WaitlistDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [signups, setSignups] = useState<WaitlistSignup[]>([]);
  const [filteredSignups, setFilteredSignups] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "company">("date");
  const { toast } = useToast();

  // Check authentication on mount
  useEffect(() => {
    const authStatus = sessionStorage.getItem("waitlist_admin_auth");
    setIsAuthenticated(authStatus === "true");
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem("waitlist_admin_auth", "true");
      setPinError(false);
      fetchSignups();
    } else {
      setPinError(true);
      setPinInput("");
      toast({
        title: "Invalid PIN",
        description: "Please enter the correct 4-digit PIN.",
        variant: "destructive",
      });
    }
  };

  const fetchSignups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("waitlist_signups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSignups(data || []);
      setFilteredSignups(data || []);
    } catch (error) {
      console.error("Error fetching signups:", error);
      toast({
        title: "Error",
        description: "Failed to load waitlist signups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && signups.length === 0) {
      fetchSignups();
    }
  }, [isAuthenticated]);

  // Handle search and filtering
  useEffect(() => {
    let filtered = [...signups];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (signup) =>
          signup.email.toLowerCase().includes(query) ||
          signup.company_name.toLowerCase().includes(query) ||
          signup.full_name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "company":
          return a.company_name.localeCompare(b.company_name);
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredSignups(filtered);
  }, [searchQuery, sortBy, signups]);

  const handleExportCSV = () => {
    try {
      exportToCSV(filteredSignups);
      toast({
        title: "Export Successful",
        description: "Waitlist data exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data.",
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => {
    try {
      exportToJSON(filteredSignups);
      toast({
        title: "Export Successful",
        description: "Waitlist data exported to JSON.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // PIN entry screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-lg p-8 max-w-md w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Access</h1>
            <p className="text-muted-foreground">
              Enter the 4-digit PIN to access the waitlist dashboard
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setPinError(false);
                }}
                className={`text-center text-2xl tracking-widest ${
                  pinError ? "border-destructive" : ""
                }`}
                maxLength={4}
                autoFocus
              />
              {pinError && (
                <p className="text-destructive text-sm mt-2 text-center">
                  Invalid PIN. Please try again.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg">
              Access Dashboard
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard screen
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Waitlist Dashboard</h1>
              <p className="text-muted-foreground">
                Manage and export waitlist signups
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="glass-card rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{signups.length}</span>
                  <span className="text-muted-foreground">Total Signups</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="glass-card rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest First</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
                <SelectItem value="company">By Company</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredSignups.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={handleExportJSON}
                disabled={filteredSignups.length === 0}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="glass-card rounded-lg p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading signups...</p>
          </div>
        ) : filteredSignups.length === 0 ? (
          <div className="glass-card rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No signups found matching your search." : "No signups yet."}
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Use Case</TableHead>
                    <TableHead>Pain Level</TableHead>
                    <TableHead>Company Size</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignups.map((signup) => (
                    <TableRow key={signup.id}>
                      <TableCell className="font-medium">{signup.full_name}</TableCell>
                      <TableCell>{signup.email}</TableCell>
                      <TableCell>{signup.company_name}</TableCell>
                      <TableCell>{signup.job_title}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {signup.primary_use_case}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {signup.pain_level}
                        </span>
                      </TableCell>
                      <TableCell>{signup.company_size}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(signup.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Mobile Card View (for smaller screens) */}
        <div className="md:hidden space-y-4">
          {!loading &&
            filteredSignups.length > 0 &&
            filteredSignups.map((signup) => (
              <Card key={signup.id} className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">{signup.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{signup.email}</p>
                  <p className="text-sm">{signup.company_name}</p>
                  <p className="text-sm">{signup.job_title}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                      {signup.pain_level}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(signup.created_at)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default WaitlistDashboard;

