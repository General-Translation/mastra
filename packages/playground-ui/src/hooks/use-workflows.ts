import type { Workflow } from '@mastra/core/workflows';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { WorkflowRunResult, MastraClient } from '@mastra/client-js';

export const useWorkflow = (workflowId: string, baseUrl: string) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const client = new MastraClient({
    baseUrl: baseUrl || '',
  });

  useEffect(() => {
    const fetchWorkflow = async () => {
      setIsLoading(true);
      try {
        if (!workflowId) {
          setWorkflow(null);
          setIsLoading(false);
          return;
        }
        const res = await client.getWorkflow(workflowId).details();
        if (!res) {
          setWorkflow(null);
          console.error('Error fetching workflow');
          toast.error('Error fetching workflow');
          return;
        }
        const steps = res.steps;
        const stepsWithWorkflow = await Promise.all(
          Object.values(steps)?.map(async step => {
            if (!step.workflowId) return step;

            const wFlow = await client.getWorkflow(step.workflowId).details();

            if (!res) return step;

            return { ...step, stepGraph: wFlow.stepGraph, stepSubscriberGraph: wFlow.stepSubscriberGraph };
          }),
        );
        const _steps = stepsWithWorkflow.reduce((acc, b) => {
          return { ...acc, [b.id]: b };
        }, {});
        setWorkflow({ ...res, steps: _steps } as Workflow);
      } catch (error) {
        setWorkflow(null);
        console.error('Error fetching workflow', error);
        toast.error('Error fetching workflow');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflowId]);

  return { workflow, isLoading };
};

export const useExecuteWorkflow = (baseUrl: string) => {
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);

  const client = new MastraClient({
    baseUrl: baseUrl || '',
  });

  const createWorkflowRun = async ({ workflowId, prevRunId }: { workflowId: string; prevRunId?: string }) => {
    try {
      const workflow = client.getWorkflow(workflowId);
      const { runId: newRunId } = await workflow.createRun({ runId: prevRunId });
      return { runId: newRunId };
    } catch (error) {
      console.error('Error creating workflow run:', error);
      throw error;
    }
  };

  const startWorkflowRun = async ({ workflowId, runId, input }: { workflowId: string; runId: string; input: any }) => {
    try {
      const workflow = client.getWorkflow(workflowId);
      await workflow.start({ runId, triggerData: input || {} });
    } catch (error) {
      console.error('Error starting workflow run:', error);
      throw error;
    }
  };

  return { startWorkflowRun, createWorkflowRun, isExecutingWorkflow };
};

export const useWatchWorkflow = (baseUrl: string) => {
  const [isWatchingWorkflow, setIsWatchingWorkflow] = useState(false);
  const [watchResult, setWatchResult] = useState<WorkflowRunResult | null>(null);

  const watchWorkflow = async ({ workflowId, runId }: { workflowId: string; runId: string }) => {
    try {
      setIsWatchingWorkflow(true);
      const client = new MastraClient({
        baseUrl,
      });

      const workflow = client.getWorkflow(workflowId);

      await workflow.watch({ runId }, record => {
        setWatchResult(record);
      });
    } catch (error) {
      console.error('Error watching workflow:', error);

      throw error;
    } finally {
      setIsWatchingWorkflow(false);
    }
  };

  return { watchWorkflow, isWatchingWorkflow, watchResult };
};

export const useResumeWorkflow = (baseUrl: string) => {
  const [isResumingWorkflow, setIsResumingWorkflow] = useState(false);

  const resumeWorkflow = async ({
    workflowId,
    stepId,
    runId,
    context,
  }: {
    workflowId: string;
    stepId: string;
    runId: string;
    context: any;
  }) => {
    try {
      setIsResumingWorkflow(true);
      const client = new MastraClient({
        baseUrl: baseUrl || '',
      });

      const response = await client.getWorkflow(workflowId).resume({ stepId, runId, context });

      return response;
    } catch (error) {
      console.error('Error resuming workflow:', error);
      throw error;
    } finally {
      setIsResumingWorkflow(false);
    }
  };

  return { resumeWorkflow, isResumingWorkflow };
};
