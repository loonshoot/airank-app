import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/Button/index';

const Modal = ({ children, show = false, title = '', toggle = null }) => {
  return (
    <Transition appear as={Fragment} show={show}>
      <Dialog
        className="fixed inset-0 z-50 overflow-y-auto text-dark"
        onClose={toggle}
      >
        <div className="flex items-center justify-center h-screen p-5">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>
          <span aria-hidden="true" className="inline-block align-middle">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative inline-block p-10 my-10 space-y-5 overflow-hidden text-left align-middle transition-all transform bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl max-w-lg w-full">
              <Dialog.Title as="h2" className="text-2xl font-bold leading-5 text-white">
                {title}
              </Dialog.Title>
              {children}
              <button
                onClick={toggle}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};



export default Modal;
