'use client';

import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/providers/workspace';

/**
 * Modal that prompts users to upgrade when they hit plan limits
 */
export function UpgradeModal({ isOpen, onClose }) {
  const router = useRouter();
  const { workspace } = useWorkspace();

  return (
    <Modal show={isOpen} toggle={onClose}>
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-white">
          Upgrade Required
        </h2>

        <p className="text-gray-300">
          You have reached one of your limits
        </p>

        <Button
          background="Green"
          border="Light"
          onClick={() => {
            onClose();
            router.push(`/${workspace?.slug}/settings/billing?changePlan=true`);
          }}
          width="Full"
        >
          Upgrade to continue
        </Button>
      </div>
    </Modal>
  );
}
