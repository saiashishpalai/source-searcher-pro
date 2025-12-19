import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Slack, Clock, Calendar, Globe, Hash, Lock, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Settings {
  slack_channel_id?: string;
  slack_channel_name?: string;
  schedule_day: string;
  schedule_time: string;
  timezone: string;
  last_sent_at?: string;
}

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const TIMES = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

interface WeeklyUpdateSettingsProps {
  onSettingsSaved?: () => void;
  onClose?: () => void;
}

export function WeeklyUpdateSettings({ onSettingsSaved, onClose }: WeeklyUpdateSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    slack_channel_id: '',
    slack_channel_name: '',
    schedule_day: 'friday',
    schedule_time: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadChannels();
  }, []);

  const loadSettings = async () => {
    try {
      const { settings: savedSettings } = await ApiClient.getWeeklyUpdateSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    setError(null);
    try {
      const { channels: channelList } = await ApiClient.getSlackChannels();
      setChannels(channelList);
      setSlackConnected(true);
    } catch (error: any) {
      console.error('Failed to load channels:', error);
      if (error.message?.includes('Slack not connected')) {
        setSlackConnected(false);
        setError('Slack not connected. Connect Slack in Connected Sources first.');
      } else {
        setError('Failed to load channels. Please try again.');
      }
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await ApiClient.saveWeeklyUpdateSettings({
        slackChannelId: settings.slack_channel_id,
        slackChannelName: settings.slack_channel_name,
        scheduleDay: settings.schedule_day,
        scheduleTime: settings.schedule_time,
        timezone: settings.timezone,
      });
      setHasChanges(false);
      setSaveSuccess(true);
      onSettingsSaved?.();
      
      // Auto-close after showing success state
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setSaveError(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleChannelChange = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    setSettings(prev => ({
      ...prev,
      slack_channel_id: channelId,
      slack_channel_name: channel ? `#${channel.name}` : ''
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Slack className="h-5 w-5 text-[#4A154B]" />
          Weekly Update Settings
        </CardTitle>
        <CardDescription className="text-white/50">
          Select a Slack channel and schedule for automated weekly updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slack Channel Selection */}
        <div className="space-y-3">
          <Label className="text-white/80 flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Slack Channel
          </Label>
          
          {!slackConnected ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-400">
                {error || 'Slack not connected. Connect Slack in Connected Sources first.'}
              </p>
            </div>
          ) : isLoadingChannels ? (
            <div className="flex items-center gap-2 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              <span className="text-sm text-white/40">Loading channels...</span>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
              <AlertCircle className="h-4 w-4 text-white/40 shrink-0" />
              <p className="text-sm text-white/40">
                No channels found. Add the Haven7 bot to a channel first.
              </p>
            </div>
          ) : (
            <Select
              value={settings.slack_channel_id || ''}
              onValueChange={handleChannelChange}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map(channel => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center gap-2">
                      {channel.is_private ? (
                        <Lock className="h-3 w-3 text-white/40" />
                      ) : (
                        <Hash className="h-3 w-3 text-white/40" />
                      )}
                      <span>{channel.name}</span>
                      <span className="text-white/30 text-xs">
                        ({channel.num_members} members)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <p className="text-xs text-white/40">
            Only channels where the Haven7 bot is added will appear here
          </p>
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <Label className="text-white/80 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-white/50 mb-1.5 block">Day</Label>
              <Select
                value={settings.schedule_day}
                onValueChange={(value) => updateSetting('schedule_day', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map(day => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-white/50 mb-1.5 block">Time</Label>
              <Select
                value={settings.schedule_time}
                onValueChange={(value) => updateSetting('schedule_time', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map(time => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-3">
          <Label className="text-white/80 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Timezone
          </Label>
          <Select
            value={settings.timezone}
            onValueChange={(value) => updateSetting('timezone', value)}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule Info */}
        <div className="rounded-lg bg-white/5 border border-white/10 p-4">
          <p className="text-sm text-white/60">
            <span className="text-white/80 font-medium">How it works:</span> A draft update will be auto-generated every{' '}
            <span className="text-white">{DAYS.find(d => d.value === settings.schedule_day)?.label}</span> at{' '}
            <span className="text-white">{TIMES.find(t => t.value === settings.schedule_time)?.label}</span>.
            You'll review and send it manually.
          </p>
        </div>

        {/* Last sent */}
        {settings.last_sent_at && (
          <p className="text-xs text-white/40 pt-2">
            Last update sent: {new Date(settings.last_sent_at).toLocaleString()}
          </p>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || !slackConnected || saveSuccess}
          className={cn(
            "w-full text-white border-0 transition-all duration-300",
            saveSuccess 
              ? "bg-green-600/30 hover:bg-green-600/30" 
              : saveError
                ? "bg-red-600/20 hover:bg-red-600/30"
                : hasChanges && slackConnected 
                  ? "bg-green-600/20 hover:bg-green-600/30"
                  : "bg-white/10 hover:bg-white/20"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {hasChanges ? 'Save Settings' : 'No Changes'}
            </>
          )}
        </Button>
        
        {saveError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            {saveError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
