<?php
declare(strict_types=1);

namespace app\command;

use app\service\TaskSyncService;
use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;

class SyncPendingLoop extends Command
{
    protected function configure()
    {
        $this->setName('molizhishu:sync-loop')
            ->addOption('interval', 'i', Option::VALUE_OPTIONAL, 'seconds between sync runs', 60)
            ->addOption('limit', 'l', Option::VALUE_OPTIONAL, 'maximum unfinished tasks per run', 20)
            ->addOption('once', null, Option::VALUE_NONE, 'run one iteration and exit')
            ->setDescription('Run Molizhishu unfinished task sync loop inside ThinkPHP.');
    }

    protected function execute(Input $input, Output $output)
    {
        $interval = max(5, (int) $input->getOption('interval'));
        $limit = max(1, (int) $input->getOption('limit'));
        $once = (bool) $input->getOption('once');
        $sync = $this->app->make(TaskSyncService::class);

        $output->writeln(sprintf('molizhishu sync loop started interval=%ds limit=%d once=%s', $interval, $limit, $once ? 'true' : 'false'));

        do {
            $started = date('Y-m-d H:i:s');
            $summary = $sync->syncUnfinished($limit, 'thinkphp-sync-loop');
            $output->writeln(sprintf(
                '[%s] total=%d synced=%d failed=%d',
                $started,
                $summary['total'],
                $summary['synced'],
                $summary['failed']
            ));

            foreach ($summary['errors'] as $error) {
                $output->writeln(sprintf('failed task=%s message=%s', $error['taskId'], $error['message']));
            }

            if ($once) {
                break;
            }

            sleep($interval);
        } while (true);
    }
}
