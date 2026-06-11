<?php
declare(strict_types=1);

namespace app\command;

use app\service\TaskSyncService;
use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;

class SyncPendingTasks extends Command
{
    protected function configure()
    {
        $this->setName('molizhishu:sync-pending')
            ->addOption('limit', 'l', Option::VALUE_OPTIONAL, 'maximum unfinished tasks to sync', 20)
            ->setDescription('Sync unfinished Molizhishu monitor tasks once.');
    }

    protected function execute(Input $input, Output $output)
    {
        $limit = max(1, (int) $input->getOption('limit'));
        $summary = $this->app->make(TaskSyncService::class)->syncUnfinished($limit);
        $output->writeln(sprintf(
            'total=%d synced=%d failed=%d',
            $summary['total'],
            $summary['synced'],
            $summary['failed']
        ));

        foreach ($summary['errors'] as $error) {
            $output->writeln(sprintf('failed task=%s message=%s', $error['taskId'], $error['message']));
        }
    }
}
