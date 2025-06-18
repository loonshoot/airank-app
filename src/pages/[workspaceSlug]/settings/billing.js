import { useState } from 'react';
import formatDistance from 'date-fns/formatDistance';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { redirectToCheckout } from '@/lib/client/stripe';
import { getInvoices, getProducts } from '@/lib/server/stripe';
import { getPayment } from '@/prisma/services/customer';
import Script from 'next/script';

const Billing = ({ invoices, products }) => {
  const [isSubmitting, setSubmittingState] = useState(false);
  const [showModal, setModalVisibility] = useState(false);
  const subscribe = (priceId) => {
    setSubmittingState(true);
    api(`/api/payments/subscription/${priceId}`, {
      method: 'POST',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        (async () => redirectToCheckout(response.data.sessionId))();
      }
    });
  };

  const toggleModal = () => setModalVisibility(!showModal);

  return (
    <AccountLayout>
      <Script src="https://js.chargebee.com/v2/chargebee.js" data-cb-site="loonshoot-test" ></Script>
      <Meta title="Outrun - Billing" />
      <Content.Title
        title="Billing"
        subtitle="Manage your billing and preferences"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title="Setup payment details"
            subtitle="Your usage of outrun will be limited until you setup your payment method."
          >
          </Card.Body>
          <Card.Footer>
            <small>You will be redirected to the payment page</small>
            <Button
              background="Pink"
              border="Light"
              data-cb-type="portal"
            >
              Manage
            </Button>
          </Card.Footer>
        </Card>
      </Content.Container>
      {/* <Content.Divider thick />
      <Content.Title
        title="Invoices"
        subtitle="View and download invoices you may need"
      />
      <Content.Divider />
      {invoices.length > 0 ? (
        <Content.Container>
          <table className="table-auto">
            <thead>
              <tr className="text-left">
                <th>Invoice Number</th>
                <th>Created</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr key={index} className="text-sm hover:bg-gray-100">
                  <td className="px-3 py-5">
                    <Link
                      href={invoice.hosted_invoice_url}
                      className="text-blue-600"
                      target="_blank"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="py-5">
                    {formatDistance(
                      new Date(invoice.created * 1000),
                      new Date(),
                      {
                        addSuffix: true,
                      }
                    )}
                  </td>
                  <td className="py-5">{invoice.status}</td>
                  <td className="py-5">
                    <Link
                      href={invoice.hosted_invoice_url}
                      className="text-blue-600"
                      target="_blank"
                    >
                      &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Content.Container>
      ) : (
        <Content.Empty>
          Once you&apos;ve paid for something on Outrun, invoices will show
          up here
        </Content.Empty>
      )} */}
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  const customerPayment = await getPayment(session.user?.email);
  const [invoices, products] = await Promise.all([
    getInvoices(customerPayment?.paymentId),
    getProducts(),
  ]);
  return {
    props: {
      invoices,
      products,
    },
  };
};

export default Billing;
